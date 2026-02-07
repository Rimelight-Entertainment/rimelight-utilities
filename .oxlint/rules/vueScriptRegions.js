import { defineRule } from "oxlint";

/**
 * Rule: vue-script-regions
 *
 * Rationale:
 * Enforces a strict organizational structure within Vue <script setup> blocks.
 * It groups code into defined regions (Meta, Props, Emits, Slots, Logic)
 * and ensures imports are at the top.
 *
 * If a region is missing/empty, it populates it with a standardized comment template.
 */
export const vueScriptRegions = defineRule({
  meta: {
    type: "layout",
    docs: {
      description: "Enforce region organization in Vue script setup.",
      category: "Stylistic Issues",
      recommended: true,
    },
    fixable: "code",
    messages: {
      invalidOrder: "Script block is not organized according to the project standard regions.",
    },
  },

  create(context) {
    const filename = context.filename;
    // Extract Component Name for templates (MyComponent)
    const basename = filename.split(/[\\/]/).pop().replace(/\..*$/, "");
    const componentName = basename
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => {
        if (part.toUpperCase() === part && part.length > 1) {
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join("");

    return {
      Program(node) {
        const sourceCode = context.sourceCode;
        const body = node.body;

        // 1. Categorize Nodes
        const buckets = {
          imports: [],
          meta: [],
          props: [],
          emits: [],
          slots: [],
          logic: [],
        };

        // Helper to grab full text of a node including preceding comments
        const getNodeText = (n) => {
          const comments = sourceCode.getCommentsBefore(n);
          // Filter out existing region markers to prevent duplication
          const validComments = comments.filter(
            (c) => !c.value.includes("region") && !c.value.includes("endregion")
          );

          let prefix = "";
          if (validComments.length > 0) {
            prefix = validComments.map((c) => sourceCode.getText(c)).join("\n") + "\n";
          }
          return prefix + sourceCode.getText(n);
        };

        body.forEach((statement) => {
          if (statement.type === "ImportDeclaration") {
            buckets.imports.push(statement);
            return;
          }

          // Check for Interfaces (Props/Emits naming convention)
          if (statement.type === "ExportNamedDeclaration" && statement.declaration?.type === "TSInterfaceDeclaration") {
            const name = statement.declaration.id.name;
            if (name.endsWith("Props")) {
              buckets.props.push(statement);
              return;
            }
            if (name.endsWith("Emits")) {
              buckets.emits.push(statement);
              return;
            }
          }

          if (statement.type === "TSInterfaceDeclaration") {
            const name = statement.id.name;
            if (name.endsWith("Props")) {
              buckets.props.push(statement);
              return;
            }
            if (name.endsWith("Emits")) {
              buckets.emits.push(statement);
              return;
            }
          }

          // Check for Expression Statements (define*)
          if (statement.type === "ExpressionStatement" && statement.expression.type === "CallExpression") {
            const callee = statement.expression.callee.name;
            if (callee === "definePageMeta") {
              buckets.meta.push(statement);
              return;
            }
          }

          // Check for Variable Declarations (const props = defineProps, etc.)
          if (statement.type === "VariableDeclaration") {
            const decl = statement.declarations[0];
            if (decl && decl.init && decl.init.type === "CallExpression") {
              const calleeName = decl.init.callee.name || (decl.init.callee.type === "Identifier" ? decl.init.callee.name : null);

              // Handle withDefaults(defineProps(...))
              let isProps = calleeName === "defineProps";
              let isEmits = calleeName === "defineEmits";
              let isSlots = calleeName === "defineSlots";

              if (calleeName === "withDefaults" && decl.init.arguments.length > 0) {
                const firstArg = decl.init.arguments[0];
                if (firstArg.type === "CallExpression" && firstArg.callee.name === "defineProps") {
                  isProps = true;
                }
              }

              if (isProps) {
                buckets.props.push(statement);
                return;
              }
              if (isEmits) {
                buckets.emits.push(statement);
                return;
              }
              if (isSlots) {
                buckets.slots.push(statement);
                return;
              }
            }
          }

          // Default to Logic
          buckets.logic.push(statement);
        });

        // 2. Templates
        const templates = {
          meta: `// definePageMeta({\n//   layout: "default"\n// })`,
          props: `// export interface ${componentName}Props {\n//   sample: string\n// }\n// const props = defineProps<${componentName}Props>()`,
          emits: `// export interface ${componentName}Emits {\n//   (e: 'change', id: number): void\n// }\n// const emit = defineEmits<${componentName}Emits>()`,
          slots: `// const slots = defineSlots<{ default(props: { msg: string }): any }>()`,
          logic: `// Logic`,
        };

        // 3. Construct the Ideal Output
        const buildRegion = (name, nodes, template) => {
          const regionStart = `/* region ${name} */`;
          const regionEnd = `/* endregion */`;

          let content = "";
          if (nodes.length === 0) {
            content = template;
          } else {
            content = nodes.map(getNodeText).join("\n\n");
          }

          return `${regionStart}\n${content}\n${regionEnd}`;
        };

        const importsBlock = buckets.imports.map(getNodeText).join("\n");
        const metaBlock = buildRegion("Page Meta", buckets.meta, templates.meta);
        const propsBlock = buildRegion("Props", buckets.props, templates.props);
        const emitsBlock = buildRegion("Emits", buckets.emits, templates.emits);
        const slotsBlock = buildRegion("Slots", buckets.slots, templates.slots);
        const logicBlock = buildRegion("Logic & State", buckets.logic, templates.logic);

        // Assemble pieces with double newlines for spacing
        const newContent = [
          importsBlock,
          metaBlock,
          propsBlock,
          emitsBlock,
          slotsBlock,
          logicBlock
        ].filter(Boolean).join("\n\n").trim() + "\n";

        // 4. Comparison & Fix
        // We get the current text, strip existing region markers manually to do a "content comparison"
        // or simply compare the reconstructed string with the original string.
        const currentText = sourceCode.getText();

        // A simple equality check usually fails due to whitespace nuances.
        // However, since we want to ENFORCE this exact formatting,
        // we replace if strict equality fails.
        if (currentText.trim() !== newContent.trim()) {
          context.report({
            node,
            messageId: "invalidOrder",
            fix(fixer) {
              return fixer.replaceText(node, newContent);
            }
          });
        }
      },
    };
  },
});
