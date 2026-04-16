#[derive(serde::Serialize)]
pub struct AnsiSegmentDto {
    pub text: String,
    #[serde(rename = "color")]
    pub color: Option<String>,
    #[serde(rename = "backgroundColor")]
    pub background_color: Option<String>,
    #[serde(rename = "fontWeight")]
    pub font_weight: Option<u16>,
}

#[tauri::command]
pub async fn parse_ansi_lines(lines: Vec<String>) -> Result<Vec<Vec<AnsiSegmentDto>>, String> {
    let parsed = lines
        .into_iter()
        .map(|line| {
            vec![AnsiSegmentDto {
                text: line,
                color: None,
                background_color: None,
                font_weight: None,
            }]
        })
        .collect();
    Ok(parsed)
}
