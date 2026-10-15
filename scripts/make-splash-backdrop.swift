// Makes media/splash-backdrop.mp4: a 1-second clip that holds media/splash.mp4's first frame
// (plain navy, before the names and logo appear). The splash loops it, stretched, behind the
// animation, so the space around the animation is the exact same navy. Both go through the
// browser's video color handling, which differs from page (CSS) colors and between browsers.
//
// The frame's color data is copied as-is (no RGB conversion), with the same BT.709 color tags.
// It's a normal 1-second clip, not a single frame, because some browsers won't show a clip that
// short. (2 Mbps keeps every frame at the source color; the file is still under 2 KB.)
//
// usage: swift scripts/make-splash-backdrop.swift media/splash.mp4 media/splash-backdrop.mp4
import AVFoundation

let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let track = asset.tracks(withMediaType: .video)[0]
let size = track.naturalSize

// The first decoded frame, in the video's own YCbCr format.
let reader = try! AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
reader.add(output)
reader.startReading()
guard let first = output.copyNextSampleBuffer(), let frame = CMSampleBufferGetImageBuffer(first) else {
  fatalError("couldn't read the first frame")
}
reader.cancelReading()

let url = URL(fileURLWithPath: a[2]); try? FileManager.default.removeItem(at: url)
let writer = try! AVAssetWriter(outputURL: url, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: Int(size.width), AVVideoHeightKey: Int(size.height),
  AVVideoColorPropertiesKey: [
    AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
    AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
    AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 2_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: nil)
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)
let fps: Int32 = 10
for i in 0..<Int(fps) {          // 1 second
  while !input.isReadyForMoreMediaData { usleep(1000) }
  adaptor.append(frame, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
print(writer.status == .completed ? "ok" : "failed: \(String(describing: writer.error))")
