import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import prettier from "prettier";
import * as fs from "fs";
import * as path from "path";

// Read the input code from exhibitA.ts
const inputFilePath = path.join(__dirname, "exhibitA.ts");
const code = fs.readFileSync(inputFilePath, "utf-8");

// Async lint function using prettier
async function lint(code: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const formattedCode = prettier.format(code, { parser: "typescript" });
      resolve(formattedCode);
    }, Math.random() * 1000);
  });
}

// Parse the code into AST
const ast = parse(code, { sourceType: "module", plugins: ["typescript"] });

// Store the linted parts
let newCode = code;
const promises: Promise<void>[] = [];
// Traverse the AST to find the template literals prefixed with /*tsx*/
traverse(ast, {
  TemplateLiteral(path) {
    const leadingComments = path.node.leadingComments;
    if (leadingComments && leadingComments.some(comment => comment.value.includes("tsx"))) {
      const start = path.node.start!;
      const end = path.node.end!;
      const templateCode = newCode.slice(start+1, end-1);

      // Lint the template literal
      promises.push(
        lint(templateCode).then(lintedCode => {
          newCode = newCode.slice(0, start+1) + lintedCode + newCode.slice(end-1);
        })
      );
    }
  }
});

// Wait for all linting promises to complete
Promise.all(promises).then(() => {
  const outputFilePath = path.join(__dirname, "exhibitA-linted.ts");
  fs.writeFileSync(outputFilePath, newCode, "utf-8");
  console.log("Linted code has been written to exhibitA-linted.ts");
});


