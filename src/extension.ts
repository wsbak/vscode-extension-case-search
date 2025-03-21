import { commands, QuickPickItem, window } from "vscode";
import type { ExtensionContext } from "vscode";
import { paramCase, camelCase, pascalCase, snakeCase, constantCase, capitalCase, pathCase } from "change-case";


const kebabCaseQPI:       QuickPickItem = { label: "kebab-case",        alwaysShow: true, };
const camelCaseQPI:       QuickPickItem = { label: "camelCase",         alwaysShow: true, };
const pascalCaseQPI:      QuickPickItem = { label: "PascalCase",        alwaysShow: true, };
const snakeCaseQPI:       QuickPickItem = { label: "snake_case",        alwaysShow: true, };
const snakeUpperCaseQPI:  QuickPickItem = { label: "UPPER_SNAKE_CASE",  alwaysShow: true, };
const capitalCaseQPI:     QuickPickItem = { label: "Capital Case",      alwaysShow: true, };
const pathCaseQPI:        QuickPickItem = { label: "path/case",         alwaysShow: true, };
const quickPickItems:     QuickPickItem[] = [ kebabCaseQPI,
                                              camelCaseQPI, pascalCaseQPI,
                                              snakeCaseQPI, snakeUpperCaseQPI,
                                              capitalCaseQPI,
                                              pathCaseQPI ];

function transformQuery2RegExp(query: string, scope: string): string | undefined {
  switch(scope) {
    case "kebab-case":
      return paramCase(query);
    case "camelCase":
      return camelCase(query);
    case "PascalCase":
      return pascalCase(query);
    case "snake_case":
      return snakeCase(query);
    case "UPPER_SNAKE_CASE":
      return constantCase(query);
    case "Capital Case":
      return capitalCase(query);
    case "path/case":
      return pathCase(query);
  }
}

// build regex query with all cases selected
function buildRegexQuery(query: string, selectedItems: readonly QuickPickItem[]): string {
  const queries: String[] = [];
  for (const item of selectedItems) {
    const queryScope = transformQuery2RegExp(query, item.label) || query;
    queries.push(queryScope);
  }

  return removeDuplicates(queries).join("|");
}

/**
 * Construct a copy of an array with duplicate items removed.
 * Where duplicate items exist, only the first instance will be kept.
 */
function removeDuplicates<T>(array: T[]): T[] {
  return [...new Set(array)];
}

// Read selectedItems (cases) from context.workspaceState
function readSelectedItems(context: ExtensionContext): QuickPickItem[] {
  const selectedItems: QuickPickItem[] = [];
  for (const quickPickItem of quickPickItems) {
    if (context.workspaceState.get<boolean>(quickPickItem.label, false) === true) {
      selectedItems.push(quickPickItem);
    }
  }
  console.log("readSelectedItems", selectedItems);
  return selectedItems;
}

// Save selectedItems (cases) into context.workspaceState
function saveSelectedItems(context: ExtensionContext, selectedItems: readonly QuickPickItem[]) {
  for (const quickPickItem of quickPickItems) {
    const selected = selectedItems.findIndex(item=> item === quickPickItem) >= 0;
    context.workspaceState.update(quickPickItem.label, selected);
    // console.log("previouslySelectedItems", previouslySelectedItems);
  }  
}

function getSelectedText(): string | undefined {
  const editor = window.activeTextEditor;
  const selection = editor?.selection;
  const selectedText = editor?.document.getText(selection);
  return selectedText;
}

// Get the initial value to search
function getInitialValue(context: ExtensionContext): string {
  const lastSearchedValue = context.workspaceState.get<string>("lastSearchedValue", "");
  const selectedText = getSelectedText();

  if (selectedText === undefined) {
    // No selected text
    // So start with last searched value or ""
    return lastSearchedValue;
  }

  const lastSelectedText = context.workspaceState.get<string>("lastSelectedText", "");
  if (selectedText !== lastSelectedText) {
    // Selected text modified (by user) since last search
    // So start with it
    return selectedText;
  }

  // Selected text NOT modified since last search
  // So start with last searched value or ""
  return lastSearchedValue;
}

export function activate(context: ExtensionContext) {
  context.subscriptions.push(commands.registerCommand('case-search-2.showSearchBox', async () => {

    const quickPick = window.createQuickPick();
    quickPick.items = quickPickItems;
    quickPick.canSelectMany = true;
    quickPick.selectedItems = readSelectedItems(context);
    quickPick.placeholder = "please input query text, default scope is all cases";
    quickPick.value = getInitialValue(context);
    quickPick.onDidAccept(() => {
      // console.log("onDidAccept", "value", quickPick.value, "selectedItems", quickPick.selectedItems);
      saveSelectedItems(context, quickPick.selectedItems);

      if (quickPick.value) {
        context.workspaceState.update("lastSearchedValue", quickPick.value);
        context.workspaceState.update("lastSelectedText", getSelectedText());

        // If no selectedItems, we take all quickPickItems
        const items = quickPick.selectedItems.length <= 0 ? quickPickItems : quickPick.selectedItems;
        const query = buildRegexQuery(quickPick.value, items);
        // console.log("query", query);

        commands.executeCommand("workbench.action.findInFiles", {
          query: query, triggerSearch: true, isRegex: true, isCaseSensitive: true
        });
      }
      quickPick.hide();
    });

    quickPick.show();
  }));
}

export function deactivate() {}

// Exports for test only
export const exportedForTesting = {
  kebabCaseQPI,
  camelCaseQPI,
  pascalCaseQPI,
  snakeCaseQPI,
  snakeUpperCaseQPI,
  capitalCaseQPI,
  pathCaseQPI,
  transformQuery2RegExp,
  buildRegexQuery,
};
