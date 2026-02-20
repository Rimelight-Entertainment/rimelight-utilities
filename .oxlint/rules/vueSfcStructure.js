export const vueSfcStructure = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Smart SFC structure rule that enforces regional comments and ordering.",
      category: "Style",
      recommended: true
    },
    messages: {
      missingRegion: "Missing or misspelled region: /* region {{region}} */",
      invalidOrder: "Region /* region {{current}} */ is out of order. It should appear after /* region {{previous}} */"
    }
  },

  create(context) {
    if (!context.filename.endsWith(".vue")) return {}

    // Only enforce this rule for files under a 'components' folder
    const normalizedPath = context.filename.replace(/\\/g, "/");
    if (!normalizedPath.includes("/components/")) return {}

    return {
      Program(node) {
        const sourceCode = context.sourceCode
        const fullText = sourceCode.getText()

        const expectedRegions = [
          "Props",
          "Emits",
          "Slots",
          "Styles",
          "Meta",
          "State",
          "Lifecycle",
          "Logic"
        ];

        let lastFoundIndex = -1;

        for (let i = 0; i < expectedRegions.length; i++) {
          const region = expectedRegions[i];
          const regionMarker = `/* region ${region} */`;
          const regionIndex = fullText.indexOf(regionMarker);

          if (regionIndex === -1) {
            context.report({
              node,
              messageId: "missingRegion",
              data: { region }
            });
          } else {
            if (regionIndex < lastFoundIndex) {
              const prevRegion = expectedRegions.slice(0, i).filter(r => fullText.includes(`/* region ${r} */`)).pop() || expectedRegions[0];
              context.report({
                node,
                messageId: "invalidOrder",
                data: { current: region, previous: prevRegion }
              });
            }
            // Update lastFoundIndex to current, so we can check subsequent regions
            lastFoundIndex = Math.max(lastFoundIndex, regionIndex);
          }
        }
      }
    }
  }
}
