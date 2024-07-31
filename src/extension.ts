import * as vscode from 'vscode';

let lastExpandForwardSelection: vscode.Selection | undefined;
let lastMoveForwardSelection: vscode.Selection | undefined;
let lastMoveBackwardSelection: vscode.Selection | undefined;

function findContiguousBlock(document: vscode.TextDocument, line: number, searchUp: boolean, includeNextEmptyLine: boolean): [number, number] {
    let startLine = line;
    let endLine = line;

    if (searchUp) {
        while (startLine > 0 && !document.lineAt(startLine - 1).isEmptyOrWhitespace) {
            startLine--;
        }
        endLine = startLine;
        while (endLine < document.lineCount - 1 && !document.lineAt(endLine + 1).isEmptyOrWhitespace) {
            endLine++;
        }
    } else {
        while (startLine > 0 && !document.lineAt(startLine - 1).isEmptyOrWhitespace) {
            startLine--;
        }
        while (endLine < document.lineCount - 1 && !document.lineAt(endLine + 1).isEmptyOrWhitespace) {
            endLine++;
        }
        if (includeNextEmptyLine && endLine < document.lineCount - 1) {
            endLine++; // Include the next empty line
        }
    }

    return [startLine, endLine];
}

function selectContiguousNonEmptyLines(editor: vscode.TextEditor, document: vscode.TextDocument, currentSelection: vscode.Selection, mode: 'expandForward' | 'moveForward' | 'moveBackward'): vscode.Selection {
    let startLine: number;
    let endLine: number;
    let lastSelection: vscode.Selection | undefined;

    switch (mode) {
        case 'expandForward':
            lastSelection = lastExpandForwardSelection;
            break;
        case 'moveForward':
            lastSelection = lastMoveForwardSelection;
            break;
        case 'moveBackward':
            lastSelection = lastMoveBackwardSelection;
            break;
    }

    if (!lastSelection || !currentSelection.isEqual(lastSelection)) {
        // First execution or cursor moved
        [startLine, endLine] = findContiguousBlock(document, currentSelection.active.line, mode === 'moveBackward', mode !== 'moveBackward');
    } else {
        // Repeated execution
        switch (mode) {
            case 'expandForward':
                startLine = lastSelection.start.line;
                [, endLine] = findContiguousBlock(document, lastSelection.end.line + 1, false, true);
                break;
            case 'moveForward':
                [startLine, endLine] = findContiguousBlock(document, lastSelection.end.line + 1, false, true);
                break;
            case 'moveBackward':
                let searchLine = lastSelection.start.line - 1;
                while (searchLine >= 0 && document.lineAt(searchLine).isEmptyOrWhitespace) {
                    searchLine--;
                }
                if (searchLine >= 0) {
                    [startLine, endLine] = findContiguousBlock(document, searchLine, true, false);
                } else {
                    // If we've reached the top of the document, maintain the current selection
                    return lastSelection;
                }
                break;
        }
    }

    // Create a new selection
    const newSelection = new vscode.Selection(
        new vscode.Position(startLine, 0),
        new vscode.Position(endLine, document.lineAt(endLine).text.length)
    );

    // Update the last selection
    switch (mode) {
        case 'expandForward':
            lastExpandForwardSelection = newSelection;
            break;
        case 'moveForward':
            lastMoveForwardSelection = newSelection;
            break;
        case 'moveBackward':
            lastMoveBackwardSelection = newSelection;
            break;
    }

    return newSelection;
}

export function activate(context: vscode.ExtensionContext) {
    let expandForwardDisposable = vscode.commands.registerCommand('extension.selectContiguousNonEmptyLinesExpandForward', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.selection = selectContiguousNonEmptyLines(editor, editor.document, editor.selection, 'expandForward');
            editor.revealRange(new vscode.Range(editor.selection.end, editor.selection.end));
        }
    });

    let moveForwardDisposable = vscode.commands.registerCommand('extension.selectContiguousNonEmptyLinesMoveForward', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.selection = selectContiguousNonEmptyLines(editor, editor.document, editor.selection, 'moveForward');
            editor.revealRange(new vscode.Range(editor.selection.end, editor.selection.end));
        }
    });

    let moveBackwardDisposable = vscode.commands.registerCommand('extension.selectContiguousNonEmptyLinesMoveBackward', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.selection = selectContiguousNonEmptyLines(editor, editor.document, editor.selection, 'moveBackward');
            editor.revealRange(new vscode.Range(editor.selection.start, editor.selection.start));
        }
    });

    context.subscriptions.push(expandForwardDisposable, moveForwardDisposable, moveBackwardDisposable);
}

export function deactivate() {}
