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
- **Cuenta de GitHub:** Si tienes más de una cuenta de GitHub, selecciona la cuenta bajo la que se creará este proyecto. Los proyectos creados en una cuenta de la organización de GitHub son compartidos entre los miembros de esa organización de GitHub.
- **Nombre**
- **Subtítulo**
- **Descripción**
- **URL del repositorio de GitHub:** Esta debe ser una URL válida de GitHub para un repositorio público que contiene su proyecto de SubQuery. El archivo `schema.graphql` debe estar en la raíz de su directorio ([aprender más sobre la estructura de directorio](../create/introduction.md#directory-structure)).
- **Ocultar proyecto:** Si se selecciona, esto ocultará el proyecto del explorador público de SubQuery. ¡Mantén esta opción sin seleccionar si quieres compartir tu SubQuery con la comunidad! ![Cree su primer proyecto](/assets/img/projects-create.png)

Crea tu proyecto y lo verás en la lista de proyectos de SubQuery. *¡Ya casi hemos llegado! We just need to deploy a new version of it. </p>

![Proyecto creado sin despliegue](/assets/img/projects-no-deployment.png)

#### Despliega tu primera versión

Al crear un proyecto configurará el comportamiento de visualización del proyecto, debe desplegar una versión antes de que se ponga en marcha. Desplegar una versión activa una nueva operación de indexación de SubQuery para iniciar, y configurar el servicio de consultas requerido para comenzar a aceptar solicitudes GraphQL. También puede desplegar nuevas versiones a proyectos existentes aquí.

Con su nuevo proyecto, verá un botón Desplegar Nueva versión. Haga clic en esto y rellene la información requerida sobre el despliegue:
- **Commit Hash de la nueva versión:** Desde GitHub seleccione el commit correcto del código base del proyecto SubQuery que desea desplegar
- **Versión del indexador:** Esta es la versión del servicio de nodos de SubQuery en la que desea ejecutar esta SubQuery. Ver [`@subql/node`](https://www.npmjs.com/package/@subql/node)
- **Versión de consulta:** Esta es la versión del servicio de consulta de SubQuery en la que desea ejecutar esta SubQuery. Ver [`@subql/query`](https://www.npmjs.com/package/@subql/query)

![Desplegar tu primer proyecto](https://static.subquery.network/media/projects/projects-first-deployment.png)

Si se implementa con éxito, verás que el indexador empieza a funcionar e informa de los avances en la indexación de la cadena actual. Este proceso puede llevar tiempo hasta que llegue al 100%.

## Siguiente paso - Conecta a tu proyecto
Una vez que el despliegue se ha completado correctamente y nuestros nodos han indexado sus datos de la cadena, podrás conectarte a tu proyecto a través del punto final de la Consulta mostrada en GraphQL.

![Proyecto en despliegue y sincronización](/assets/img/projects-deploy-sync.png)

Alternativamente, puedes hacer clic en los tres puntos al lado del título de tu proyecto, y verlo en SubQuery Explorer. Allí puedes usar el playground del navegador para empezar - [lee más sobre cómo usar nuestro explorador aquí](../query/query.md).

![Proyectos en el Explorador de SubQuery](/assets/img/projects-explorer.png)

## Añadir cuenta de la organización de GitHub a SubQuery Projects

Es común publicar su proyecto SubQuery bajo el nombre de su cuenta de la Organización de GitHub en lugar de su cuenta personal de GitHub. En cualquier momento puede cambiar su cuenta seleccionada en [SubQuery Proyects](https://project.subquery.network) usando el switcher de cuenta.

![Cambiar entre cuentas de GitHub](/assets/img/projects-account-switcher.png)

Si no puede ver su cuenta de la organización de GitHub listada en el switcher, puede que necesite conceder acceso a SubQuery para su Organización de GitHub (o solicitarlo a un administrador). Para hacer esto, primero necesita revocar los permisos de su cuenta de GitHub a la aplicación de SubQuery. Para hacer esto, inicia sesión en la configuración de tu cuenta en GitHub, ve a Aplicaciones, y en la pestaña Aplicaciones OAuth Authorized Apps, revocar SubQuery - [puedes seguir los pasos exactos aquí](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth). **No te preocupes, esto no eliminará tu proyecto de SubQuery y no perderás ningún dato.**

![Revocar acceso a la cuenta de GitHub](/assets/img/project_auth_revoke.png)

Una vez que haya revocado el acceso, cierre la sesión de [SubQuery Proyects](https://project.subquery.network) e inicie sesión de nuevo. Debe ser redirigido a una página titulada *Autorizar subconsulta* donde puede solicitar o conceder acceso a SubQuery a su cuenta de la Organización de GitHub. Si no tienes permisos de administración, debes solicitar a un administrador que lo active.

![Revocar la aprobación de una cuenta de GitHub](/assets/img/project_auth_request.png)

Una vez que esta solicitud ha sido aprobada por su administrador (o si eres capaz de concederlo tu mismo), verás la cuenta correcta de la Organizacion en Github en el cambiador de cuenta.