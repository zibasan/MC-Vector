use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::{Component, Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use std::time::{SystemTime, UNIX_EPOCH};

const RATE_LIMIT_WINDOW: Duration = Duration::from_secs(1);

static RATE_LIMITER: OnceLock<Mutex<HashMap<String, Instant>>> = OnceLock::new();

#[derive(Clone, Copy)]
enum Role {
    Admin,
    User,
    Viewer,
}

impl Role {
    fn as_str(self) -> &'static str {
        match self {
            Self::Admin => "admin",
            Self::User => "user",
            Self::Viewer => "viewer",
        }
    }

    fn parse(value: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().as_str() {
            "admin" => Ok(Self::Admin),
            "user" => Ok(Self::User),
            "viewer" => Ok(Self::Viewer),
            _ => Err(
                "security_gateway authorize_action requires payload.role as \"admin\"|\"user\"|\"viewer\""
                    .to_string(),
            ),
        }
    }
}

fn sanitize_log_input(input: &str) -> String {
    input.replace('<', "&lt;").replace('>', "&gt;")
}

fn authorize(role: Role, action: &str) -> Result<(), String> {
    let normalized_action = action.trim();
    if normalized_action.is_empty() {
        return Err("security_gateway authorize_action requires non-empty payload.action".to_string());
    }

    let role_name = role.as_str();
    let allowed = match role {
        Role::Admin => Ok(()),
        Role::User => {
            if normalized_action == "start_server" || normalized_action == "stop_server" {
                Ok(())
            } else {
                Err(format!(
                    "Forbidden: role {} is not allowed to perform action {}",
                    role_name, normalized_action
                ))
            }
        }
        Role::Viewer => {
            if is_mutating_action(normalized_action) {
                Err(format!(
                    "Forbidden: role {} is not allowed to perform action {}",
                    role_name, normalized_action
                ))
            } else {
                Ok(())
            }
        }
    };

    allowed
}

fn is_mutating_action(action: &str) -> bool {
    let normalized_action = action.trim();
    if normalized_action.is_empty() {
        return true;
    }

    !(normalized_action.starts_with("get_")
        || normalized_action.starts_with("list_")
        || normalized_action.starts_with("read_")
        || normalized_action.starts_with("fetch_")
        || normalized_action.starts_with("sanitize_")
        || normalized_action == "authorize_action"
        || normalized_action == "rate_limit_check")
}

fn check_rate_limit(user_id: &str) -> Result<(), String> {
    let limiter = RATE_LIMITER.get_or_init(|| Mutex::new(HashMap::new()));
    let mut state = limiter
        .lock()
        .map_err(|_| "security_gateway rate_limit_check internal lock error".to_string())?;
    check_rate_limit_with_state(&mut state, user_id, Instant::now())
}

fn check_rate_limit_with_state(
    state: &mut HashMap<String, Instant>,
    user_id: &str,
    now: Instant,
) -> Result<(), String> {
    let normalized_user_id = user_id.trim();
    if normalized_user_id.is_empty() {
        return Err("security_gateway rate_limit_check requires non-empty payload.userId".to_string());
    }

    if let Some(last_call) = state.get(normalized_user_id) {
        if now.duration_since(*last_call) < RATE_LIMIT_WINDOW {
            return Err(format!(
                "Forbidden: rate limit exceeded for user {}",
                normalized_user_id
            ));
        }
    }

    state.insert(normalized_user_id.to_string(), now);
    Ok(())
}

fn sanitize_command_arg(arg: &str) -> String {
    arg.replace(';', "").replace('&', "")
}

fn validate_safe_command(program: &str, args: &[String]) -> Result<(String, Vec<String>), String> {
    let normalized_program = program.trim();
    if normalized_program.is_empty() {
        return Err("security_gateway validate_safe_command requires non-empty payload.program".to_string());
    }

    let file_name = Path::new(normalized_program)
        .file_name()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .ok_or_else(|| "security_gateway validate_safe_command program is invalid".to_string())?;

    if file_name != "java" && file_name != "java.exe" {
        return Err("Forbidden: program is not in allowlist".to_string());
    }

    let sanitized_args = args.iter().map(|arg| sanitize_command_arg(arg)).collect();
    Ok((normalized_program.to_string(), sanitized_args))
}

fn resolve_safe_path(base: &str, input: &str) -> Result<String, String> {
    let normalized_base = base.trim();
    let normalized_input = input.trim();
    if normalized_base.is_empty() || normalized_input.is_empty() {
        return Err("security_gateway resolve_safe_path requires non-empty payload.base and payload.input".to_string());
    }

    let base_path = PathBuf::from(normalized_base);
    if !base_path.is_absolute() {
        return Err("security_gateway resolve_safe_path payload.base must be absolute".to_string());
    }

    let input_path = PathBuf::from(normalized_input);
    if input_path.is_absolute() {
        return Err("Path traversal detected".to_string());
    }

    if input_path
        .components()
        .any(|component| matches!(component, Component::ParentDir | Component::CurDir))
    {
        return Err("Path traversal detected".to_string());
    }

    Ok(base_path.join(input_path).to_string_lossy().to_string())
}

fn build_audit_entry(user: &str, action: &str) -> Result<Value, String> {
    let normalized_user = user.trim();
    let normalized_action = action.trim();
    if normalized_user.is_empty() || normalized_action.is_empty() {
        return Err("security_gateway audit_log requires non-empty payload.user and payload.action".to_string());
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "Failed to create audit timestamp".to_string())?
        .as_secs();

    log::info!(
        target: "security.audit",
        "[AUDIT] user={} action={} timestamp={}",
        normalized_user,
        normalized_action,
        timestamp
    );

    Ok(json!({
        "user": normalized_user,
        "action": normalized_action,
        "timestamp": timestamp,
    }))
}

#[tauri::command]
pub async fn security_gateway(action: String, payload: Value) -> Result<Value, String> {
    match action.trim() {
        "sanitize_log" => {
            let input = payload
                .get("input")
                .and_then(Value::as_str)
                .ok_or_else(|| "security_gateway sanitize_log requires string payload.input".to_string())?;
            Ok(json!({
                "sanitized": sanitize_log_input(input),
            }))
        }
        "authorize_action" => {
            let role_raw = payload
                .get("role")
                .and_then(Value::as_str)
                .ok_or_else(|| "security_gateway authorize_action requires string payload.role".to_string())?;
            let action = payload
                .get("action")
                .and_then(Value::as_str)
                .ok_or_else(|| "security_gateway authorize_action requires string payload.action".to_string())?;
            authorize(Role::parse(role_raw)?, action)?;
            Ok(json!({
                "allowed": true,
            }))
        }
        "rate_limit_check" => {
            let user_id = payload
                .get("userId")
                .and_then(Value::as_str)
                .ok_or_else(|| "security_gateway rate_limit_check requires string payload.userId".to_string())?;
            check_rate_limit(user_id)?;
            Ok(json!({
                "allowed": true,
            }))
        }
        "validate_safe_command" => {
            let program = payload
                .get("program")
                .and_then(Value::as_str)
                .ok_or_else(|| "security_gateway validate_safe_command requires string payload.program".to_string())?;
            let args = payload
                .get("args")
                .and_then(Value::as_array)
                .map(|items| {
                    items
                        .iter()
                        .map(|item| {
                            item.as_str().map(|value| value.to_string()).ok_or_else(|| {
                                "security_gateway validate_safe_command payload.args must be string[]".to_string()
                            })
                        })
                        .collect::<Result<Vec<String>, String>>()
                })
                .transpose()?
                .unwrap_or_default();
            let (validated_program, sanitized_args) = validate_safe_command(program, &args)?;
            Ok(json!({
                "allowed": true,
                "program": validated_program,
                "args": sanitized_args,
            }))
        }
        "resolve_safe_path" => {
            let base = payload
                .get("base")
                .and_then(Value::as_str)
                .ok_or_else(|| "security_gateway resolve_safe_path requires string payload.base".to_string())?;
            let input = payload
                .get("input")
                .and_then(Value::as_str)
                .ok_or_else(|| "security_gateway resolve_safe_path requires string payload.input".to_string())?;
            let resolved = resolve_safe_path(base, input)?;
            Ok(json!({
                "resolvedPath": resolved,
            }))
        }
        "audit_log" => {
            let user = payload
                .get("user")
                .and_then(Value::as_str)
                .ok_or_else(|| "security_gateway audit_log requires string payload.user".to_string())?;
            let action = payload
                .get("action")
                .and_then(Value::as_str)
                .ok_or_else(|| "security_gateway audit_log requires string payload.action".to_string())?;
            let entry = build_audit_entry(user, action)?;
            Ok(json!({
                "logged": true,
                "entry": entry,
            }))
        }
        _ => Err(format!("Unsupported security action: {}", action)),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        authorize, build_audit_entry, check_rate_limit_with_state, resolve_safe_path, sanitize_log_input,
        validate_safe_command, Role, RATE_LIMIT_WINDOW,
    };
    use serde_json::Value;
    use std::collections::HashMap;
    use std::time::{Duration, Instant};

    #[test]
    fn escapes_html_angle_brackets() {
        let input = "<script>alert('xss')</script>";
        let sanitized = sanitize_log_input(input);
        assert_eq!(sanitized, "&lt;script&gt;alert('xss')&lt;/script&gt;");
    }

    #[test]
    fn keeps_plain_text() {
        let input = "minecraft server started";
        assert_eq!(sanitize_log_input(input), input);
    }

    #[test]
    fn admin_can_execute_any_action() {
        assert!(authorize(Role::Admin, "delete_world").is_ok());
    }

    #[test]
    fn user_can_start_and_stop_only() {
        assert!(authorize(Role::User, "start_server").is_ok());
        assert!(authorize(Role::User, "stop_server").is_ok());
        assert!(authorize(Role::User, "delete_world").is_err());
    }

    #[test]
    fn viewer_can_read_non_mutating_action() {
        assert!(authorize(Role::Viewer, "get_server_status").is_ok());
    }

    #[test]
    fn viewer_is_forbidden_for_mutating_action() {
        assert!(authorize(Role::Viewer, "start_server").is_err());
    }

    #[test]
    fn rate_limit_blocks_rapid_repeated_calls() {
        let now = Instant::now();
        let mut state = HashMap::new();
        assert!(check_rate_limit_with_state(&mut state, "rate-limit-test-user", now).is_ok());
        assert!(check_rate_limit_with_state(
            &mut state,
            "rate-limit-test-user",
            now + (RATE_LIMIT_WINDOW - Duration::from_millis(1))
        )
        .is_err());
    }

    #[test]
    fn rate_limit_allows_after_window() {
        let now = Instant::now();
        let mut state = HashMap::new();
        assert!(check_rate_limit_with_state(&mut state, "rate-limit-test-user-2", now).is_ok());
        assert!(check_rate_limit_with_state(
            &mut state,
            "rate-limit-test-user-2",
            now + RATE_LIMIT_WINDOW
        )
        .is_ok());
    }

    #[test]
    fn validate_safe_command_allows_java_and_sanitizes_args() {
        let args = vec!["foo;bar".to_string(), "x&y".to_string()];
        let (program, sanitized_args) = validate_safe_command("java", &args).expect("should pass");
        assert_eq!(program, "java");
        assert_eq!(sanitized_args[0], "foobar");
        assert_eq!(sanitized_args[1], "xy");
    }

    #[test]
    fn validate_safe_command_rejects_non_allowlisted_program() {
        let args = vec!["--help".to_string()];
        assert!(validate_safe_command("/bin/sh", &args).is_err());
    }

    #[test]
    fn resolve_safe_path_rejects_traversal() {
        let result = resolve_safe_path("/app/data", "../etc/passwd");
        assert!(result.is_err());
    }

    #[test]
    fn resolve_safe_path_builds_absolute_path() {
        let resolved = resolve_safe_path("/app/data", "servers/a").expect("should resolve");
        assert_eq!(resolved, "/app/data/servers/a");
    }

    #[test]
    fn build_audit_entry_contains_required_fields() {
        let entry = build_audit_entry("user-1", "start_server").expect("should build");
        assert_eq!(entry.get("user").and_then(Value::as_str), Some("user-1"));
        assert_eq!(entry.get("action").and_then(Value::as_str), Some("start_server"));
        assert!(entry.get("timestamp").and_then(Value::as_u64).is_some());
    }
}
