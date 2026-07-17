export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Overlays (click ripples, region selection) are added in later steps.
  },
});
