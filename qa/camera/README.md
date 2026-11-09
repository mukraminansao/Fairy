# FAIRY camera preview review

- [Camera consent](fairy-camera-consent.png), 1672 × 941. The sample model is shown until the visitor starts the camera.
- [Live makeup preview](fairy-camera-live.png), 1672 × 941. The camera view shows the simulated feed with Mulberry lipstick and the current makeup layers.
- [Phone layout](fairy-camera-390.png), 390 × 844. Stop and show-makeup controls stay visible around the frame.
- [Sample model](fairy-sample-model.png), 1672 × 941. The established studio layout is the default.

The sample view was compared against the prior studio QA capture and the original studio reference. Against the prior capture, the mean RGB difference was 0.16/255, concentrated around the newly enabled camera button and the updated footer. No separate live camera design reference was supplied.

Chrome tests used the supplied studio image as a simulated camera feed and ran the actual face tracker. They checked consent, permission denial, shade updates, before/after, tracking across motion, clearing the overlay when the face leaves, and releasing the tracks on Stop and navigation. Physical-device calibration and public release are outside this private preview.


[Selfie preview](fairy-selfie-preview.png) uses the supplied model photo via the file chooser. The camera permission is not needed in this mode. The Playwright test verified that changing the shade changes the photo overlay, no file is sent over the network, and removing the photo returns to the model.

[Refined eye shadow](fairy-refined-eyeshadow.png) shows Terracotta at the default 40% on the supplied selfie fixture. The sample model and tracked previews share the same eyelid shape and pigment blending. Automated checks compared all six colors and confirmed the shadow left the sampled eye and brow pixels untouched.

[Selfie before/after and additional makeup](fairy-selfie-comparison.png) shows the comparison at 50% with brow gel, mascara, contour and eyeliner added. Chrome covered these effects and tested pixels near the lip outline and lash line. Chrome and Edge used a simulated webcam to verify camera startup, the default-device fallback and the phone layout; they did not access the laptop webcam.
