# MIDI Input Integration

## Overview
Your app now supports real-time MIDI input from connected devices like keyboards, controllers, and digital pianos. When you connect a MIDI device and grant permission, any notes you play are instantly rendered through the high-quality piano audio engine.

## Features

### Automatic Permission Request
- When the app loads, it requests Web MIDI API permissions
- Browser will prompt you to allow or deny access
- Once approved, MIDI input is immediately available

### Device Detection
- Automatically detects connected MIDI devices
- Supports multiple simultaneous MIDI inputs
- Handles device connection/disconnection dynamically
- Shows status notifications for device events

### Real-time Note Playback
- MIDI Note On events trigger piano note playback via the audio engine
- MIDI Note Off events properly release notes with natural decay
- Velocity information is respected (quieter/louder based on MIDI velocity)
- Master volume can be controlled via MIDI CC #7

### Status Indicators
The app displays real-time MIDI status in the bottom-right corner:
- 🎹 **Ready** (green) - MIDI device(s) connected and ready
- ⏳ **Waiting** (orange) - MIDI API enabled but no devices detected yet
- ✓ **Connected** (green) - Device just connected
- ⚠ **Disconnected** (orange) - Device was disconnected
- ✗ **Error** (red) - MIDI error occurred

## How to Use

### Setup
1. Connect your MIDI device (keyboard, controller, etc.) to your computer
2. Load the app in your browser
3. Grant MIDI permissions when prompted
4. You'll see a status notification confirming connection

### Playing Notes
1. Play notes on your MIDI device
2. Each note will play through the app's piano audio engine
3. The note will sustain until you release the key (MIDI Note Off)
4. Adjust velocity for dynamic expression

### Volume Control
- Use MIDI CC #7 (Master Volume) on your device to control app volume
- Or manually adjust in the browser's volume control

## Technical Details

### Files Added
- **midi-input-manager.js** - Core MIDI input handling and event routing

### Files Modified
- **modular-music-theory.html** - Added midi-input-manager.js script
- **modular-app.js** - Initializes MIDI manager on app startup
- **piano-sample-engine.js** - Added stopNote() and stopAllNotes() methods

### Web MIDI API
- Uses standard Web MIDI API (supported in Chrome, Edge, Opera, Firefox)
- Requires HTTPS or localhost
- One-time permission grant per browser/site

### Architecture
```
MIDI Device → Web MIDI API → MIDIInputManager → PianoSampleEngine → Audio Output
                                    ↓
                           Event Listeners (optional)
```

### Event Handling
The MIDI manager emits events that can be listened to:
- `noteOn` - When a MIDI note starts
- `noteOff` - When a MIDI note stops
- `controlChange` - When a MIDI CC message is received

Example usage:
```javascript
window.modularApp.midiManager.on('noteOn', (data) => {
    console.log(`Note ${data.midi} played with velocity ${data.velocity}`);
});
```

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome  | ✓ Full | Best support |
| Edge    | ✓ Full | Chromium-based |
| Firefox | ✓ Full | Full support |
| Safari  | ✗ None | Not supported on macOS/iOS |
| Opera   | ✓ Full | Chromium-based |

## Troubleshooting

### "MIDI not working"
1. Ensure your MIDI device is properly connected
2. Check that you granted MIDI permissions
3. Try reconnecting the device
4. Refresh the browser page

### "No MIDI devices detected"
1. Verify device is turned on and connected
2. Check device drivers are installed (Windows)
3. Try a different USB port
4. Restart the browser

### "MIDI permission denied"
1. Allow MIDI access when prompted
2. Check browser permissions settings
3. Clear site data and try again

### "MIDI stops working after a while"
1. Device may have disconnected
2. Check connection status indicator
3. Reconnect device
4. Refresh page if needed

## Future Enhancements
- MIDI CC mapping for app controls
- Recording MIDI sequences
- MIDI output support (trigger external devices)
- Latency optimization
- Touch keyboard as fallback MIDI input
