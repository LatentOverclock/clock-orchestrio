# Organization Requirements
**API between frontend and backend:** graphql  
**Coding Style:** Strongly domain-driven and modular (colocation of what belongs together)


### Project Requirements
Project requirements can be found inside the project.md file inside the project root.
They have to be followed as longs they don't contradict with the organization-requirements.

#### Versions
For every new revision of the project-requirements, a project.md with the version-sufix exists, containing the changes in the corresponding revision.
The project.md file (without version-sufix) contains the resulting requirements from all revisions. If the version in project.md (title) does not match the biggest revision, it has to be updated according to the revision-differences and the new requirements have to be implemented.

### Docker
Frontend and backend should have their own docker-containers. They should be managed with docker-compose.
A Makefile should contain all the necessary docker-compose commands.


### Authentication
Requirements for "logging in" and "to register" as a user imply that there needs to be some authentication in the system. This normally also implies that there are resources that can only be accessed by the user, when he is authenticated.


## Frontend
If requirements don't mention how something should be achievable with the specified system, it normally means that it should be achievable by the user via frontend.

#### Technologies
Typescript, React, React-Relay, Tailwind

#### TypeScript configuration
Use a preset-based `tsconfig.json` via `extends` (for example `@tsconfig/*`) and only override project-specific options.
This keeps projects reproducible while avoiding repeated boilerplate defaults.

#### Screens
Event if it is not mentioned, applications should normally be divided into multiple screens.


## Backend
Technologies: Go, PostgreSQL (relational database)

#### Database
Even if it is not mentioned in the requirements. If there needs to be persistend data, one should normally add a postgres-db via docker-compose.
If a database is used, all the functions of the cmdrunner dbcommand.Standard commands should be implemented.
The db:data:load command should load some seed-data.

#### Commands
If some commands have to be executed from the cli. It should be implemented using the cmdrunner package: github.com/timble-one/cmdrunner
The package is private until now and therefore projects are created from a go-workspace including the cmdrunner-package.
