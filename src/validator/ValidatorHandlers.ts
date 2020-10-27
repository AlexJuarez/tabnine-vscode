import * as vscode from "vscode";
import { setState } from "../binary/requests";
import CompletionOrigin from "../CompletionOrigin";
import { StatePayload } from "../consts";
import { VALIDATOR_IGNORE_REFRESH_COMMAND } from "./commands";
import { StateType } from "./utils";
import {
  clearCache,
  Completion,
  setIgnore,
  VALIDATOR_BINARY_VERSION,
} from "./ValidatorClient";

const IGNORE_VALUE = "__IGNORE__";

export async function validatorClearCacheHandler() {
  await clearCache();
  setState({
    [StatePayload.STATE]: { state_type: StateType.clearCache },
  });
}

// FIXME: try to find the exact type for the 3rd parameter...
export async function validatorSelectionHandler(
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  { currentSuggestion, allSuggestions, reference, threshold }: any
) {
  try {
    const eventData = eventDataOf(
      editor,
      currentSuggestion,
      allSuggestions,
      reference,
      threshold,
      false
    );
    setState(eventData);
  } catch (error) {
    console.error(error);
  }
}

export async function validatorIgnoreHandler(
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  { allSuggestions, reference, threshold, responseId }: any
) {
  try {
    await setIgnore(responseId);
    vscode.commands.executeCommand(VALIDATOR_IGNORE_REFRESH_COMMAND);
    const completion: Completion = {
      value: IGNORE_VALUE,
      score: 0,
    };
    const eventData = eventDataOf(
      editor,
      completion,
      allSuggestions,
      reference,
      threshold,
      true
    );
    setState(eventData);
  } catch (error) {
    console.error(error);
  }
}

function eventDataOf(
  editor: vscode.TextEditor,
  currentSuggestion: Completion,
  allSuggestions: Completion[],
  reference: string,
  threshold: string,
  isIgnore: boolean = false
) {
  let index = allSuggestions.findIndex((sug) => sug === currentSuggestion);
  if (index === -1) {
    index = allSuggestions.length;
  }
  const suggestions = allSuggestions.map((sug) => {
    return {
      length: sug.value.length,
      strength: resolveDetailOf(sug),
      origin: CompletionOrigin.CLOUD,
    };
  });

  const length = currentSuggestion.value.length;
  const selectedSuggestion = currentSuggestion.value;
  const strength = resolveDetailOf(currentSuggestion);
  const origin = CompletionOrigin.CLOUD;
  const language = editor.document.fileName.split(".").pop();
  const numOfSuggestions = allSuggestions.length;

  const eventData = {
    ValidatorSelection: {
      language: language,
      length: length,
      strength: strength,
      origin: origin,
      index: index,
      threshold: threshold,
      num_of_suggestions: numOfSuggestions,
      suggestions: suggestions,
      selected_suggestion: selectedSuggestion,
      reference: reference,
      reference_length: reference.length,
      is_ignore: isIgnore,
      validator_version: VALIDATOR_BINARY_VERSION,
    },
  };

  return eventData;
}

function resolveDetailOf(completion: Completion): string {
  return `${completion.score}%`;
}
