import AppKit

let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)

// 与网页品牌标志一致的括号图标；各尺寸均按矢量路径绘制。
for (points, scale) in [(16,1),(16,2),(32,1),(32,2),(128,1),(128,2),(256,1),(256,2),(512,1),(512,2)] {
    let size = points * scale
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()
    let factor = CGFloat(size) / 1024
    let transform = NSAffineTransform()
    transform.scale(by: factor)
    transform.concat()
    let path = NSBezierPath(roundedRect: NSRect(x: 78, y: 78, width: 868, height: 868), xRadius: 194, yRadius: 194)
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.12)
    shadow.shadowOffset = NSSize(width: 0, height: -10)
    shadow.shadowBlurRadius = 18
    shadow.set()
    NSColor(srgbRed: 0.14, green: 0.46, blue: 0.36, alpha: 1).setFill()
    path.fill()
    NSShadow().set()
    NSColor.white.withAlphaComponent(0.96).setStroke()
    let mark = NSBezierPath()
    mark.lineWidth = 41
    mark.lineCapStyle = .round
    mark.lineJoinStyle = .round
    mark.move(to: NSPoint(x: 377, y: 718)); mark.line(to: NSPoint(x: 297, y: 718))
    mark.line(to: NSPoint(x: 297, y: 306)); mark.line(to: NSPoint(x: 377, y: 306))
    mark.move(to: NSPoint(x: 647, y: 718)); mark.line(to: NSPoint(x: 727, y: 718))
    mark.line(to: NSPoint(x: 727, y: 306)); mark.line(to: NSPoint(x: 647, y: 306))
    mark.move(to: NSPoint(x: 578, y: 648)); mark.line(to: NSPoint(x: 446, y: 376))
    mark.stroke()
    image.unlockFocus()
    let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
    let data = bitmap.representation(using: .png, properties: [:])!
    let suffix = scale == 2 ? "@2x" : ""
    try data.write(to: output.appendingPathComponent("icon_\(points)x\(points)\(suffix).png"))
}
