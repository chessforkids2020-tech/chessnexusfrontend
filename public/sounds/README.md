# Chess Sound Files

This directory contains audio files for the chess application.

## Required Sound Files

Place the following MP3 files in this directory:

1. **chess-move.mp3** - Chess piece move sound (short click/tap sound)
2. **capture.mp3** - Chess piece capture sound (slightly sharper/stronger than move)
3. **correct.mp3** - Correct puzzle answer sound (pleasant chime)
4. **error-buzz.mp3** - Wrong puzzle answer sound (low buzz or beep)
5. **success-chime.mp3** - Puzzle completed sound (triumphant jingle)
6. **chat-notification.mp3** - Chat message notification sound (gentle ping)

## Where to Get Sound Files

### Option 1: Free Sound Libraries
- **Freesound.org** - https://freesound.org/ (requires free account)
- **Zapsplat** - https://www.zapsplat.com/ (free with attribution)
- **Mixkit** - https://mixkit.co/free-sound-effects/ (free, no attribution)
- **Pixabay** - https://pixabay.com/sound-effects/ (free, no attribution)

### Option 2: Lichess Sounds (Open Source)
You can download sounds from Lichess's GitHub repository:
https://github.com/lichess-org/lila/tree/master/public/sound

### Option 3: Use Online Converters
If you find OGG or WAV files, convert them to MP3 using:
- https://cloudconvert.com/
- https://online-audio-converter.com/

## Recommended Specifications
- **Format**: MP3
- **Duration**: 0.1 - 0.5 seconds (except complete.mp3 can be up to 2 seconds)
- **Sample Rate**: 44.1 kHz
- **Bit Rate**: 128 kbps or higher
- **Volume**: Normalized to avoid clipping

## Testing
After adding sound files, test them in the application:
1. Navigate to the chess board or puzzles page
2. Make moves to hear move/capture sounds
3. Solve puzzles to hear correct/wrong/complete sounds
4. Send chat messages to hear notification sounds

## Fallback Behavior
If sound files are missing or fail to load, the application will automatically generate synthetic sounds using the Web Audio API.
