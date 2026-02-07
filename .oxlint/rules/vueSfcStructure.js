import { defineRule } from "oxlint"

export const vueSfcStructure = defineRule({
  meta: {
    type: "layout",
    docs: {
      description: "Enforces SFC block order and internal script regioning.",
      category: "Style",
      recommended: true
    },
    fixable: "code",
    messages: {
      invalidStructure: "SFC structure is incorrect. Correcting regions and block order."
    }
  },

  create(context) {
    if (!context.filename.endsWith(".vue")) return {}

    return {
      Program(node) {
        const sourceCode = context.sourceCode
        const fullText = sourceCode.getText()

        // 1. Context Check: Are we looking at the whole file or just the script guts?
        const hasTemplate = fullText.includes("<template")
        const hasScriptTag = fullText.includes("<script")
        const isFullFile = hasScriptTag || hasTemplate

        let scriptGuts = ""
        let templateGuts = ""
        let styleGuts = ""

        if (isFullFile) {
          // Extract content from existing tags
          scriptGuts = fullText.match(/<script\b[^>]* setup[^>]*>([\s\S]*?)<\/script>/)?.[1] || ""
          templateGuts = fullText.match(/<template>([\s\S]*?)<\/template>/)?.[1] || ""
          styleGuts = fullText.match(/<style\b[^>]*>([\s\S]*?)<\/style>/)?.[1] || ""
        } else {
          // If not a full file, the linter is feeding us the guts of a script tag directly
          scriptGuts = fullText
        }

        // 2. Clean and Sort Script Content
        const importRegex = /^import\s+[\s\S]*?from\s+['"].*?['"];?[\r\n]*/gm
        const imports = scriptGuts.match(importRegex) || []
        const bodyWithoutImports = scriptGuts.replace(importRegex, "").trim()

        const patterns = {
          meta: /(\/\* region Page Meta \*\/[\s\S]*?\/\* endregion \*\/)|(?:(?:\/\/ )?definePageMeta\([\s\S]*?\);?\n?)/,
          props: /(\/\* region Props \*\/[\s\S]*?\/\* endregion \*\/)|(?:(?:(?:\/\/ )?(?:export )?interface \w+Props[\s\S]*?})?[\s\S]*?(?:(?:\/\/ )?const \w+ = defineProps(?:<[\s\S]*?>)?\([\s\S]*?\);?\n?))/,
          emits: /(\/\* region Emits \*\/[\s\S]*?\/\* endregion \*\/)|(?:(?:(?:\/\/ )?(?:export )?interface \w+Emits[\s\S]*?})?[\s\S]*?(?:(?:\/\/ )?const \w+ = defineEmits(?:<[\s\S]*?>)?\([\s\S]*?\);?\n?))/
        }

        const extMeta = bodyWithoutImports.match(patterns.meta)?.[0] || null
        const extProps = bodyWithoutImports.match(patterns.props)?.[0] || null
        const extEmits = bodyWithoutImports.match(patterns.emits)?.[0] || null

        // Remove all extracted macros and existing region tags from the logic section
        let cleanLogic = bodyWithoutImports
          .replace(patterns.meta, "")
          .replace(patterns.props, "")
          .replace(patterns.emits, "")
          .replace(/\/\* region [\s\S]*?endregion \*\//g, "")
          .trim()

        const formatRegion = (content, name, boilerplate) => {
          if (content) {
            const raw = content.replace(/\/\* region .*? \*\/|\/\* endregion \*\//g, "").trim()
            if (raw.length > 0 && !raw.startsWith("// definePageMeta") && !raw.startsWith("// export interface MyComponentProps")) {
              return `/* region ${name} */\n${raw}\n/* endregion */`
            }
          }
          return `/* region ${name} */\n${boilerplate}\n/* endregion */`
        }

        const organizedScript = [
          [...new Set(imports)].join("").trim(),
          formatRegion(extMeta, "Page Meta", '// definePageMeta({\n//   layout: "default"\n// })'),
          formatRegion(extProps, "Props", '// export interface MyComponentProps {\n//   sample: string\n// }\n// const props = defineProps<MyComponentProps>()'),
          formatRegion(extEmits, "Emits", '// export interface MyEmits {\n//   (e: \'change\', id: number): void\n// }\n// const emit = defineEmits<MyEmits>()'),
          `/* region Logic & State */\n${cleanLogic || "// Logic"}\n/* endregion */`
        ].filter(v => v.trim() !== "").join("\n\n")

        // 3. Final Assembly
        let finalOutput = ""
        if (isFullFile) {
          // Re-assemble the full SFC with defined block order
          finalOutput = `<script lang="ts" setup>\n${organizedScript.trim()}\n</script>\n\n<template>\n${templateGuts.trim() || "  <div></div>"}\n</template>\n\n<style scoped>\n${styleGuts.trim()}\n</style>\n`
        } else {
          // ONLY return the guts. DO NOT add tags or we cause duplication.
          finalOutput = `\n${organizedScript.trim()}\n`
        }

        // 4. Report & Fix
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
