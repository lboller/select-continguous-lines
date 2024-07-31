import * as vscode from 'vscode';

let lastSelection: vscode.Selection | undefined;

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.selectContiguousNonEmptyLines', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return; // No open text editor
        }

        const document = editor.document;
        const currentSelection = editor.selection;
        
        let startLine: number;
        let endLine: number;

        if (!lastSelection || !currentSelection.isEqual(lastSelection)) {
            // First execution or cursor moved
            startLine = currentSelection.active.line;
            endLine = startLine;

            // Find the top of the current contiguous block
            while (startLine > 0 && !document.lineAt(startLine - 1).isEmptyOrWhitespace) {
                startLine--;
            }

            // Find the bottom of the current contiguous block
            const lastLine = document.lineCount - 1;
            while (endLine < lastLine && !document.lineAt(endLine + 1).isEmptyOrWhitespace) {
                endLine++;
            }
        } else {
            // Repeated execution, expand from last selection
            startLine = lastSelection.start.line;
            endLine = lastSelection.end.line;

            // Find the next non-empty line after the current block
            const lastLine = document.lineCount - 1;
            while (endLine < lastLine) {
                endLine++;
                if (!document.lineAt(endLine).isEmptyOrWhitespace) {
                    // Found the start of the next block, now find its end
                    while (endLine < lastLine && !document.lineAt(endLine + 1).isEmptyOrWhitespace) {
                        endLine++;
                    }
                    break;
                }
            }
        }

        // Create a new selection
        const newSelection = new vscode.Selection(
            new vscode.Position(startLine, 0),
            new vscode.Position(endLine, document.lineAt(endLine).text.length)
        );

        editor.selection = newSelection;
        lastSelection = newSelection;

        // Reveal the end of the selection
        editor.revealRange(new vscode.Range(endLine, 0, endLine, 0));
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
