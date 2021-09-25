# Publish your SubQuery Project

## Beneficios de alojar tu proyecto con SubQuery
- Ejecutaremos tus proyectos de SubQuery en un servicio público de alto rendimiento, escalable y administrado
- ¡Este servicio está siendo proporcionado a la comunidad gratis!
- Puedes hacer públicos tus proyectos para que estén listados en el [SubQuery Explorer](https://explorer.subquery.network) y cualquier persona de todo el mundo puede verlos
- Estamos integrados con GitHub, por lo que cualquiera en sus organizaciones de GitHub podrá ver proyectos de organización compartidos

## Cree su primer proyecto

#### Iniciar sesión en los proyectos de SubQuery

Antes de comenzar, asegúrese de que su proyecto SubQuery está en línea en un repositorio público de GitHub. El archivo `schema.graphql` debe estar en la raíz de su directorio.

Para crear tu primer proyecto, dirígete a [project.subquery.network](https://project.subquery.network). Necesitarás autenticarte con tu cuenta de GitHub para iniciar sesión.

En el primer inicio de sesión, se le pedirá que autorice SubQuery. Sólo necesitamos tu dirección de correo electrónico para identificar tu cuenta, y no utilizamos ningún otro dato de tu cuenta de GitHub por otras razones. En este paso, también puedes solicitar o conceder acceso a tu cuenta de la Organización de GitHub para que puedas publicar proyectos de SubQuery bajo tu Organización de GitHub en lugar de tu cuenta personal.

![Revocar la aprobación de una cuenta de GitHub](/assets/img/project_auth_request.png)

SubQuery Projects es donde administras todos los proyectos alojados subidos a la plataforma SubQuery. Puede crear, eliminar e incluso actualizar proyectos desde esta aplicación.

![Inicio de sesión de proyectos](/assets/img/projects-dashboard.png)

Si tiene una cuenta de la organización de GitHub conectada, puedes usar el interruptor de la cabecera para cambiar entre tu cuenta personal y tu cuenta de la organización de GitHub. Los proyectos creados en una cuenta de la organización de GitHub son compartidos entre los miembros de esa organización de GitHub. Para conectar su cuenta de la Organización de GitHub, puede [seguir los pasos aquí](#add-github-organization-account-to-subquery-projects).

![Cambiar entre cuentas de GitHub](/assets/img/projects-account-switcher.png)

#### Cree su primer proyecto

Empecemos haciendo clic en "Crear proyecto". Serás llevado al formulario de Proyecto Nuevo. Por favor, introduzca lo siguiente (puede cambiar esto en el futuro):
- **GitHub account:** If you have more than one GitHub account, select which account this project will be created under. Projects created in a GitHub organisation account are shared between members in that organisation.
- **Name**
- **Subtitle**
- **Description**
- **GitHub Repository URL:** This must be a valid GitHub URL to a public repository that has your SubQuery project. The `schema.graphql` file must be in the root of your directory ([learn more about the directory structure](../create/introduction.md#directory-structure)).
- **Hide project:** If selected, this will hide the project from the public SubQuery explorer. Keep this unselected if you want to share your SubQuery with the community! ![Create your first Project](/assets/img/projects-create.png)

Create your project and you'll see it on your SubQuery Project's list. *We're almost there! We just need to deploy a new version of it. </p>

![Created Project with no deployment](/assets/img/projects-no-deployment.png)

#### Deploy your first Version

While creating a project will setup the display behaviour of the project, you must deploy a version of it before it becomes operational. Deploying a version triggers a new SubQuery indexing operation to start, and sets up the required query service to start accepting GraphQL requests. You can also deploy new versions to existing projects here.

With your new project, you'll see a Deploy New Version button. Click this, and fill in the required information about the deployment:
- **Commit Hash of new Version:** From GitHub, copy the full commit hash of the version of your SubQuery project codebase that you want deployed
- **Indexer Version:** This is the version of SubQuery's node service that you want to run this SubQuery on. See [`@subql/node`](https://www.npmjs.com/package/@subql/node)
- **Query Version:** This is the version of SubQuery's query service that you want to run this SubQuery on. See [`@subql/query`](https://www.npmjs.com/package/@subql/query)

![Deploy your first Project](https://static.subquery.network/media/projects/projects-first-deployment.png)

If deployed successfully, you'll see the indexer start working and report back progress on indexing the current chain. This process may take time until it reaches 100%.

## Next Steps - Connect to your Project
Once your deployment has succesfully completed and our nodes have indexed your data from the chain, you'll be able to connect to your project via the displayed GraphQL Query endpoint.

![Project being deployed and synced](/assets/img/projects-deploy-sync.png)

Alternatively, you can click on the three dots next to the title of your project, and view it on SubQuery Explorer. There you can use the in-browser playground to get started - [read more about how to user our Explorer here](../query/query.md).

![Projects in SubQuery Explorer](/assets/img/projects-explorer.png)

## Add GitHub Organization Account to SubQuery Projects

It is common to publish your SubQuery project under the name of your GitHub Organization account rather than your personal GitHub account. At any point your can change your currently selected account on [SubQuery Projects](https://project.subquery.network) using the account switcher.

![Switch between GitHub accounts](/assets/img/projects-account-switcher.png)

If you can't see your GitHub Organization account listed in the switcher, the you may need to grant access to SubQuery for your GitHub Organization (or request it from an administrator). To do this, you first need to revoke permissions from your GitHub account to the SubQuery Application. To do this, login to your account settings in GitHub, go to Applications, and under the Authorized OAuth Apps tab, revoke SubQuery - [you can follow the exact steps here](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth). **Don't worry, this will not delete your SubQuery project and you will not lose any data.**

![Revoke access to GitHub account](/assets/img/project_auth_revoke.png)

Once you have revoked access, log out of [SubQuery Projects](https://project.subquery.network) and log back in again. You should be redirected to a page titled *Authorize SubQuery* where you can request or grant SubQuery access to your GitHub Organization account. If you don't have admin permissions, you must make a request for an adminstrator to enable this for you.

![Revoke approval from a GitHub account](/assets/img/project_auth_request.png)

Once this request has been approved by your administrator (or if are able to grant it youself), you will see the correct GitHub Organization account in the account switcher.