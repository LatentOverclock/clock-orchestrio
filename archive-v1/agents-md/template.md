If the agents-md submodule (git) is not initialized yet. This has to be done as a first step:  
`git submodule update --init agents-md`. 

Project-specific requirement changes should be added as versioned delta files (`project.vN.md`) and then consolidated by the agent into `project.md` (latest state).

The organization-wide implementation constraints in this file must be followed strictly:
[agents-md/implementation.md](agents-md/implementation.md)


