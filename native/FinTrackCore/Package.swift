// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "FinTrackCore", platforms: [.iOS(.v17), .macOS(.v13)], products: [.library(name: "FinTrackCore", targets: ["FinTrackCore"])], targets: [.target(name: "FinTrackCore"), .testTarget(name: "FinTrackCoreTests", dependencies: ["FinTrackCore"])])
