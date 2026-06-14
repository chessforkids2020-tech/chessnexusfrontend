#!/bin/bash

# Script to download free chess sound files
# This script downloads CC0 (public domain) sound files from Pixabay

echo "📥 Downloading chess sound files..."
echo "These are free, public domain sounds from various sources."
echo ""

SOUNDS_DIR="./public/sounds"

# Check if sounds directory exists
if [ ! -d "$SOUNDS_DIR" ]; then
    echo "❌ Sounds directory not found at $SOUNDS_DIR"
    echo "Please run this script from the frontend directory"
    exit 1
fi

cd "$SOUNDS_DIR"

echo "🔊 Downloading sound files..."

# Note: These are placeholder URLs. You'll need to manually download sounds or use a service
# Below are instructions for getting free sounds:

echo ""
echo "========================================="
echo "MANUAL DOWNLOAD INSTRUCTIONS"
echo "========================================="
echo ""
echo "Please download the following sounds manually and place them in:"
echo "$PWD"
echo ""
echo "1. chess-move.mp3 - Short click/tap sound"
echo "   Suggested: https://pixabay.com/sound-effects/search/chess-move/"
echo "   Or Lichess: https://github.com/lichess-org/lila/raw/master/public/sound/standard/Move.mp3"
echo ""
echo "2. capture.mp3 - Capture sound"
echo "   Suggested: https://pixabay.com/sound-effects/search/chess-capture/"
echo "   Or Lichess: https://github.com/lichess-org/lila/raw/master/public/sound/standard/Capture.mp3"
echo ""
echo "3. correct.mp3 - Pleasant chime for correct answer"
echo "   Suggested: https://pixabay.com/sound-effects/search/correct/"
echo "   Or: https://pixabay.com/sound-effects/search/success/"
echo ""
echo "4. error-buzz.mp3 - Error/wrong sound"
echo "   Suggested: https://pixabay.com/sound-effects/search/error/"
echo "   Or: https://pixabay.com/sound-effects/search/wrong/"
echo ""
echo "5. success-chime.mp3 - Victory/completion jingle"
echo "   Suggested: https://pixabay.com/sound-effects/search/victory/"
echo "   Or: https://pixabay.com/sound-effects/search/success/"
echo ""
echo "6. chat-notification.mp3 - Chat notification ping"
echo "   Suggested: https://pixabay.com/sound-effects/search/notification/"
echo "   Or: https://pixabay.com/sound-effects/search/ping/"
echo ""
echo "========================================="
echo ""
echo "QUICK OPTION - Download from Lichess (Open Source):"
echo "========================================="
echo ""
echo "Run these commands to download from Lichess:"
echo ""
echo "curl -L -o chess-move.mp3 'https://github.com/lichess-org/lila/raw/master/public/sound/standard/Move.mp3'"
echo "curl -L -o capture.mp3 'https://github.com/lichess-org/lila/raw/master/public/sound/standard/Capture.mp3'"
echo ""
echo "For other sounds, search Pixabay or use the Web Audio API fallback."
echo ""
echo "After downloading, test sounds in your application!"
echo ""

# Optionally try to download Lichess sounds if curl is available
read -p "Would you like to download Lichess sounds now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "📥 Downloading Lichess sounds..."
    
    if command -v curl &> /dev/null; then
        curl -L -o chess-move.mp3 'https://github.com/lichess-org/lila/raw/master/public/sound/standard/Move.mp3'
        curl -L -o capture.mp3 'https://github.com/lichess-org/lila/raw/master/public/sound/standard/Capture.mp3'
        echo "✅ Downloaded chess-move.mp3 and capture.mp3 from Lichess"
    else
        echo "❌ curl not found. Please install curl or download manually."
    fi
fi

echo ""
echo "✅ Setup complete! Remember to add the remaining sound files manually."
