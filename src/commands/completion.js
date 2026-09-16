// Kept as a plain list (rather than introspecting the Commander `program`)
// to avoid a circular import between index.js and this file. Update this
// alongside index.js when adding or removing a top-level command.
export const COMMAND_NAMES = [
  "init",
  "seed",
  "deploy",
  "run",
  "status",
  "contracts",
  "ui",
  "logs",
  "reset",
  "completion",
];

export function generateBashCompletion(commands = COMMAND_NAMES) {
  return `# sandbox bash completion
# Install: sandbox completion bash >> ~/.bashrc   (or source it from a completions dir)
_sandbox_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=($(compgen -W "${commands.join(" ")}" -- "$cur"))
  fi
}
complete -F _sandbox_completions sandbox
`;
}

export function generateZshCompletion(commands = COMMAND_NAMES) {
  return `#compdef sandbox
# Install: sandbox completion zsh > "\${fpath[1]}/_sandbox"   (then restart your shell)
_sandbox() {
  local -a commands
  commands=(${commands.map((c) => `'${c}'`).join(" ")})
  _describe 'command' commands
}
_sandbox
`;
}

export function generatePowerShellCompletion(commands = COMMAND_NAMES) {
  return `# sandbox PowerShell completion
# Install: sandbox completion powershell >> $PROFILE
Register-ArgumentCompleter -Native -CommandName sandbox -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
  @(${commands.map((c) => `'${c}'`).join(", ")}) |
    Where-Object { $_ -like "$wordToComplete*" } |
    ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
}
`;
}

const GENERATORS = {
  bash: generateBashCompletion,
  zsh: generateZshCompletion,
  powershell: generatePowerShellCompletion,
};

export function completionCommand(shell) {
  const generate = GENERATORS[shell];
  if (!generate) {
    console.error(`Unknown shell "${shell}". Supported: ${Object.keys(GENERATORS).join(", ")}.`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(generate());
}
