# The Sandbox

In our envisioned usage scenario, the SubQuery node is usually run by a trusted host, and the code of the SubQuery project submitted by the user to the node is not entirely trustworthy. 

Some malicious code is likely to attack the host or even compromise it, and cause damage to the data of other projects in the same host.
Therefore, we use the [VM2](https://www.npmjs.com/package/vm2) sandbox secured mechanism to reduce risks.

- Runs untrusted code securely in an isolated context, and malicious code will not access network and file system of the host, unless through the exposed interface we injected into the sandbox.

- Securely call methods and exchange data and callbacks between sandboxes

- Is immune to all known methods of attacks


## Restriction

- Limit access to certain built-in modules, only `assert` and `console` are whitelisted.

- Any 3rd party module are forbid. When defining a SubQuery project, we do not support users to add any new dependencies to `package.json`, thereby protecting the project's stability and the security in the sandbox.
