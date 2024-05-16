import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import prettier from "prettier";
import * as fs from "fs";
import * as path from "path";


// Read the input code from exhibitA.ts
try {
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
    
    // Declare variables
    const start_list: number[] = [];
    const end_list: number[] = [];
    const raw_code: string[] = [];
    const parsed_code: string[] = [];
    let output = "";
    let number_of_parsed_code = 0;
    let traversal_completed = false
    let start_update = false
    
    
    // Traverse the AST to find the template literals prefixed with /*tsx*/
    // NOTE: traverse function is synchronous, can guarantee traversal to be completed after this block
    traverse(ast, {
        TemplateLiteral(path) {
            const leadingComments = path.node.leadingComments;
            if (leadingComments && leadingComments.some(comment => comment.value.includes("tsx"))) {
                // Save start index, end index of code, and the code itself
                const start = path.node.start!;
                const end = path.node.end!;
                // Save into array for constructing of file final output
                start_list.push(start);
                end_list.push(end);
                const templateCode = code.slice(start+1, end-1); // Remove ` from start and end
                raw_code.push(templateCode)
                // Call async function to lint code
                lint(templateCode).then(lintedCode => {
                    // Need to keep track which code the async task is linting
                    let parsed_code_index = raw_code.indexOf(templateCode);
                    number_of_parsed_code ++;
                    // Save linted code
                    parsed_code[parsed_code_index] = lintedCode
                    // Check if this async task is the last to finish
                    // If yes, call function to construct output and update file
                    if (number_of_parsed_code == start_list.length && traversal_completed){
                        updateCode(parsed_code.length-1)
                        start_update = true // To guarantee updateCode function is called
                    }
                })
            }
        }
    });
    
    traversal_completed = true;
    console.log("Traversing done"); // For diagnostics and timestamping purposes
    let number_of_code_to_parse = start_list.length;
    

    // In the extremely rare case if all async tasks resolve very fast before traversal_completed is set to true
    if (number_of_parsed_code == number_of_code_to_parse && start_update == false){
        // Check if there is any linting to be done
        if (number_of_code_to_parse != 0){
            updateCode(parsed_code.length-1);
        } else {
            console.log("No template literals detected for linting! Exiting.")
        }
    }
    
    // Function to construct output of linted file
    // Starts from the end of the file to prevent any index shifting caused by parsed code having a different size
    function updateCode(index: number) {
        if (index == -1){
            console.log("All update done");
            const outputFilePath = path.join(__dirname, "exhibitA-linted.ts");
            fs.writeFileSync(outputFilePath, output, "utf-8");
            console.log("Linted code has been written to exhibitA-linted.ts");
            return
        } else {
            if (index == number_of_code_to_parse - 1){
                console.log("All async done") // For diagnostics and timestamping purposes
                output = parsed_code[index] + code.slice(end_list[index]-1);
            } else if (index != 0){
                output = parsed_code[index] + code.slice(end_list[index]-1, start_list[index+1]+1) + output;
                if (index == 1){
                    console.log(output)
                }
            } else {
                // index == 0
                output = code.slice(0, start_list[index]+1) + parsed_code[index] 
                + code.slice(end_list[index]-1, start_list[index+1]+1) + output;
            }
            updateCode(index-1);
        }
    }
} catch (error: unknown) {
    if (error instanceof Error){
        if (error.message.includes("ENOENT")){
            console.error("File not found!")
        } else {
            console.error('An error occurred:', error);
        }        
    }
}

/*
Possible Edge Cases:
- Missing file
- File with no template literals


Space Complexity:
- const code is size of file, scales linearly, O(N)
- start_list & end_list is size of file in worst case, if every character in the whole file is to be parsed, 
scales linearly, O(N)
- raw_code scales linearly, O(N)
- parsed_code scales linearly, O(N)
- output scales linearly, O(N)
- templateCode also worst case if every character in the whole file is to be parsed,
scales linearly, O(N)

Time Complexity:
The algorithm takes the following steps
1. Read code from file - Based on file size, O(N)
2. Parse code into AST - Based on file size, O(N)
3. Traverse through AST - Based on file size linearly, O(N)
4. Lint template literals - Depends on template literal size, O(N), but depends on how Prettier does it
   4a. Get index of template code - Compares string, O(N)
5. Construct and output linted result - Based on original file size, O(N) in worst case of slicing every character

*/


