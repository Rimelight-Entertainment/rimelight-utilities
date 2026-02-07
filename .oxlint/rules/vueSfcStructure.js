import { defineRule } from "oxlint"

export const vueSfcStructure = defineRule({
  meta: {
    type: "layout",
    docs: {
      description:
        "Smart SFC structure rule that prevents nested tags and enforces internal padding.",
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
        const body = scriptGuts.replace(importRegex, "").trim()

        // Improved patterns with better closure matching for TS Generics
        const patterns = {
          meta: /(\/\* region Page Meta \*\/[\s\S]*?\/\* endregion \*\/)|(?:(?:\/\/ )?definePageMeta\([\s\S]*?\);?\n?)/,
          props:
            /(\/\* region Props \*\/[\s\S]*?\/\* endregion \*\/)|(?:(?:(?:\/\/ )?(?:export )?interface \w+Props[\s\S]*?})?[\s\S]*?(?:(?:\/\/ )?const \w+ = defineProps(?:<[\s\S]*?>)?\([\s\S]*?\);?\n?))/,
          emits:
            /(\/\* region Emits \*\/[\s\S]*?\/\* endregion \*\/)|(?:(?:(?:\/\/ )?(?:export )?interface \w+Emits[\s\S]*?})?[\s\S]*?(?:(?:\/\/ )?const \w+ = defineEmits(?:<[\s\S]*?>)?\([\s\S]*?\);?\n?))/
        }

        const extMeta = body.match(patterns.meta)?.[0] || null
        const extProps = body.match(patterns.props)?.[0] || null
        const extEmits = body.match(patterns.emits)?.[0] || null

        let cleanLogic = body
          .replace(/\/\* region [\s\S]*?endregion \*\//g, "")
          .replace(extMeta || "", "")
          .replace(extProps || "", "")
          .replace(extEmits || "", "")
          .trim()

        const format = (content, name, boilerplate) => {
          if (!content) return `/* region ${name} */\n${boilerplate}\n/* endregion */`

          const raw = content
            .replace(/\/\* region .*? \*\/|\/\* endregion \*\//g, "")
            .trim()

          if (raw === "") return `/* region ${name} */\n${boilerplate}\n/* endregion */`
          return `/* region ${name} */\n${raw}\n/* endregion */`
        }

        const scriptInner = [
          imports.join("").trim(),
          format(extMeta, "Page Meta", '// definePageMeta({\n//   layout: "default"\n// })'),
          format(
            extProps,
            "Props",
            "// export interface MyComponentProps {\n//   sample: string\n// }\n// const props = defineProps<MyComponentProps>()"
          ),
          format(
            extEmits,
            "Emits",
            "// export interface MyEmits {\n//   (e: 'change', id: number): void\n// }\n// const emit = defineEmits<MyEmits>()"
          ),
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

        if (fullText !== finalOutput) {
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
