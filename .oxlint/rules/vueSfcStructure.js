import { defineRule } from "oxlint"

export const vueSfcStructure = defineRule({
  meta: {
    type: "layout",
    docs: {
      description: "Smart SFC structure rule that prevents nested tags and enforces internal padding.",
      category: "Style",
      recommended: true
    },
    fixable: "code",
    messages: {
      invalidStructure: "SFC structure is incorrect. Correcting regions and padding."
    }
  },

  create(context) {
    if (!context.filename.endsWith(".vue")) return {}

    return {
      Program(node) {
        const sourceCode = context.sourceCode
        const fullText = sourceCode.getText()
        const isFullFile = fullText.trim().startsWith("<script")

        let scriptGuts = ""
        let templateGuts = ""
        let styleGuts = ""

        if (isFullFile) {
          scriptGuts = fullText.match(/<script\b[^>]* setup[^>]*>([\s\S]*?)<\/script>/)?.[1] || ""
          templateGuts = fullText.match(/<template>([\s\S]*?)<\/template>/)?.[1] || ""
          styleGuts = fullText.match(/<style\b[^>]*>([\s\S]*?)<\/style>/)?.[1] || ""
        } else {
          scriptGuts = fullText
        }

        const importRegex = /^import\s+[\s\S]*?from\s+['"].*?['"];?[\r\n]*/gm
        const imports = scriptGuts.match(importRegex) || []
        const bodyWithoutImports = scriptGuts.replace(importRegex, "").trim()

        // 1. Define patterns that capture the WHOLE region if it exists, or the raw macro if it doesn't
        const patterns = {
          meta: /(\/\* region Page Meta \*\/[\s\S]*?\/\* endregion \*\/)|(?:(?:\/\/ )?definePageMeta\([\s\S]*?\);?\n?)/,
          props: /(\/\* region Props \*\/[\s\S]*?\/\* endregion \*\/)|(?:(?:(?:\/\/ )?(?:export )?interface \w+Props[\s\S]*?})?[\s\S]*?(?:(?:\/\/ )?const \w+ = defineProps(?:<[\s\S]*?>)?\([\s\S]*?\);?\n?))/,
          emits: /(\/\* region Emits \*\/[\s\S]*?\/\* endregion \*\/)|(?:(?:(?:\/\/ )?(?:export )?interface \w+Emits[\s\S]*?})?[\s\S]*?(?:(?:\/\/ )?const \w+ = defineEmits(?:<[\s\S]*?>)?\([\s\S]*?\);?\n?))/
        }

        // 2. Extract content
        const extMeta = bodyWithoutImports.match(patterns.meta)?.[0] || null
        const extProps = bodyWithoutImports.match(patterns.props)?.[0] || null
        const extEmits = bodyWithoutImports.match(patterns.emits)?.[0] || null

        // 3. Clean Logic: Remove EVERYTHING matched by the patterns above to prevent duplication
        let cleanLogic = bodyWithoutImports
          .replace(patterns.meta, "")
          .replace(patterns.props, "")
          .replace(patterns.emits, "")
          .replace(/\/\* region Logic & State \*\/|\/\* endregion \*\//g, "") // Clean logic region tags
          .trim()

        const format = (content, name, boilerplate) => {
          // If the content exists and isn't just whitespace
          if (content && content.trim().length > 0) {
            // If it's already wrapped in a region, just return it (unwrapped and re-wrapped to normalize)
            const raw = content.replace(/\/\* region .*? \*\/|\/\* endregion \*\//g, "").trim()
            if (raw.length > 0) {
              return `/* region ${name} */\n${raw}\n/* endregion */`
            }
          }
          // Only return boilerplate if content is truly empty/null
          return `/* region ${name} */\n${boilerplate}\n/* endregion */`
        }

        // 4. Rebuild the Script Body
        const scriptInner = [
          imports.join("").trim(),
          format(extMeta, "Page Meta", '// definePageMeta({\n//   layout: "default"\n// })'),
          format(extProps, "Props", '// export interface MyComponentProps {\n//   sample: string\n// }\n// const props = defineProps<MyComponentProps>()'),
          format(extEmits, "Emits", '// export interface MyEmits {\n//   (e: \'change\', id: number): void\n// }\n// const emit = defineEmits<MyEmits>()'),
          `/* region Logic & State */\n${cleanLogic || "// Logic"}\n/* endregion */`
        ]
          .filter((v) => v.trim() !== "")
          .join("\n\n")

        let finalOutput = ""
        if (isFullFile) {
          finalOutput = `<script lang="ts" setup>\n${scriptInner.trim()}\n</script>\n\n<template>\n${templateGuts.trim() || "  <div></div>"}\n</template>\n\n<style scoped>\n${styleGuts.trim()}\n</style>\n`
        } else {
          finalOutput = `\n${scriptInner.trim()}\n`
        }

        // 5. Comparison (ignore whitespace differences to prevent infinite loops)
        if (fullText.trim() !== finalOutput.trim()) {
          context.report({
            node,
            messageId: "invalidStructure",
            fix(fixer) {
              return fixer.replaceTextRange([0, fullText.length], finalOutput)
            }
          })
        }
      }
    }
  }
})
