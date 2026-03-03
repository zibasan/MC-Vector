#!/usr/bin/env bash
set -e

echo "========================================"
echo "🔧  VS Code Extensions Installer"
echo "========================================"
echo ""

if [ ! -f .vscode/extensions.json ]; then
	echo "⚠️  .vscode/extensions.json not found. Aborting operation."
	exit 1
fi

echo "📦 Starting installation..."
echo ""

while IFS= read -r ext; do
	if [[ -n "$ext" ]]; then
		if command -v code >/dev/null 2>&1; then
			if code --list-extensions | grep -Fxq "$ext"; then
				echo "→ This extension is already installed. Skipping.: $ext"
			else
				echo "→ Installing extension: $ext"
				if code --install-extension "$ext"; then
					echo "  ✅ Installed successfully: $ext"
				else
					echo "  ❌ Installation failed: $ext"
				fi
			fi
		else
			echo "⚠️  'code' command not available for installing extension: $ext"
		fi
		echo "----------------------------------------"
	fi
done < <(jq -r '.recommendations[]' .vscode/extensions.json)

echo ""
echo "🎉 Done!"
echo "========================================"
