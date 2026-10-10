// Exit 0 when run by an AI coding agent, 1 otherwise. Used by lefthook.yml to
// pick between the fast staged-file checks (humans) and the full suite (agents).
import {isAgent} from 'std-env'

process.exit(isAgent ? 0 : 1)
