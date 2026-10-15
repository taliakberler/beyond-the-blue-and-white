// Makes media/splash-backdrop.mp4: the first moment of media/splash.mp4 (its first frame: plain navy, before the
// names and logo appear), copied without re-encoding. The splash stretches it behind the animation so the
// space around it is the exact same navy: both go through the browser's video color handling,
// which differs from page (CSS) colors and between browsers.
// usage: swift scripts/make-splash-backdrop.swift media/splash.mp4 media/splash-backdrop.mp4 [seconds]
import AVFoundation
let a = CommandLine.arguments
let seconds = a.count > 3 ? Double(a[3])! : 0.02   // just the first frame: names start fading in by 0.04 s
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let out = URL(fileURLWithPath: a[2]); try? FileManager.default.removeItem(at: out)
let ex = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough)!
ex.outputURL = out; ex.outputFileType = .mp4; ex.shouldOptimizeForNetworkUse = true
ex.timeRange = CMTimeRange(start: .zero, duration: CMTime(seconds: seconds, preferredTimescale: 600))
let done = DispatchSemaphore(value: 0)
ex.exportAsynchronously { done.signal() }
done.wait()
print(ex.status == .completed ? "ok" : "failed: \(String(describing: ex.error))")
