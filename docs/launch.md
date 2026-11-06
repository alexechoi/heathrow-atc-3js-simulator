# X launch kit

Release: 6 November 2026. The reviewed app build (`534efcb`) is published at the play URL. Deployments are batched into reviewed milestones; smaller iterations remain local.

Validation: 22 automated tests pass, with browser checks covering the 12-model gallery, touch route drawing, live ground-to-tower handover and smooth touchdown. The final 20-second MP4 passes decoding and browser playback checks.

## Main post

> Flight Control, but it's Heathrow in 3D.
>
> Land arrivals, manage pushback and taxi, then clear departures. The traffic keeps coming. Mistakes end your shift.
>
> Built with Three.js. Free + open source.
>
> https://heathrow-simulator.alexchoi.xyz/

Attach [`media/heathrow-launch.mp4`](media/heathrow-launch.mp4): a 20-second, 1280 × 720, 24 fps H.264 film captured during the release review, with captions and no audio. The opening Terminal 5 flyby leads into departure and arrival gameplay, then the airport reveal. Taxi and runway-entry time is condensed between shots; visible movement uses the game simulation. The landing, handover and airport-reveal shots were replaced after review fixes. No generated footage or frame interpolation.

## Follow-up

> Source + model viewer + photo references:
> https://github.com/alexechoi/heathrow-atc-3js-simulator
>
> A game with mapped geometry and fictional traffic. FlightGear aircraft credits and GPL source included.
>
> How many flights can you handle? Copy your result after a shift.

## Media

- [Launch film](media/heathrow-launch.mp4) and [caption file](media/heathrow-launch.srt)
- [Desktop opening view](screenshots/release-desktop.jpg)
- [Phone opening view](screenshots/release-mobile.jpg)
- [Aircraft close-up review](media/aircraft-model-review.mp4)
- [Terminal 3 model](screenshots/model-t3.jpg)
- [Collision effects and shift report](screenshots/incident-effects.jpg)
- [Photo references and modelling notes](references.md)
- [Social preview image](../public/og.jpg)

Suggested media description: A flyby of Heathrow Terminal 5 cuts to a British Airways 787 at a runway holding point. The controller accepts the ground-to-tower handover and clears takeoff. Another arrival lands, followed by an aerial view of the airport and the play link.

## Reproduce the candidate

```sh
npm ci
npm test
npm run build
npm run preview -- --port 4173
# In another terminal:
node scripts/release-e2e.mjs
node scripts/startup-e2e.mjs
node scripts/operations-e2e.mjs
node scripts/aircraft-integration-e2e.mjs
node scripts/models-e2e.mjs
node scripts/touch-route-e2e.mjs
PREVIEW_ONLY=1 node scripts/capture-launch.mjs
node scripts/capture-launch.mjs
```

The capture needs Chromium, FFmpeg and access to Esri imagery. It writes the new social image as well; rebuild afterwards to include it in `dist`. Automated browser checks use software WebGL in this workspace, so their render times are not consumer-device frame-rate measurements. The trailer shows the actual rendered game; the A350/A380/777 remain simpler procedural aircraft studies, and terminal models remain photo-informed approximations.

## Publication

No X post has been sent. Before posting, check the MP4's first frame and mobile readability in X's composer. Use the native video attachment, with the play link in the post and source link in the reply.
