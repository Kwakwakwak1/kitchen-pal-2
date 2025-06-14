fix(api): handle null response from external service

Previously, when the third-party API returned a 204 No Content, our code
threw an unhandled exception and crashed. This patch:

- Checks for a 204 status and returns an empty payload instead.
- Adds a unit test covering the no-content case.
- Updates error-handling docs accordingly.
