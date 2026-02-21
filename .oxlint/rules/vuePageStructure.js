export const vuePageStructure = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Enforces regional comments and ordering for Vue pages, excluding components.",
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

    const normalizedPath = context.filename.replace(/\\/g, "/");

    // Check if the file is in /pages but NOT in /components
    const isInPages = normalizedPath.includes("/pages/");
    const isInComponents = normalizedPath.includes("/components/");

    if (!isInPages || isInComponents) return {}

    return {
      Program(node) {
        const sourceCode = context.sourceCode
        const fullText = sourceCode.getText()

        const expectedRegions = [
          "State",
          "Meta",
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
              loc: { line: 1, column: 0 },
              messageId: "missingRegion",
              data: { region }
            });
          } else {
            if (regionIndex < lastFoundIndex) {
              const prevRegion = expectedRegions
                .slice(0, i)
                .filter(r => fullText.includes(`/* region ${r} */`))
                .pop() || expectedRegions[0];

              context.report({
                loc: { line: 1, column: 0 },
                messageId: "invalidOrder",
                data: { current: region, previous: prevRegion }
              });
            }
            lastFoundIndex = Math.max(lastFoundIndex, regionIndex);
          }
        }
      }
    }
  }
}
