import { Elysia } from "elysia";

const app = new Elysia()
  .get('/', ({ cookie }) => {
    // Try both methods
    try {
      cookie.test_cookie.set({
        value: "hello",
        path: '/',
        maxAge: 3600
      });
      return "set worked";
    } catch(e) {
      console.error(e);
      cookie.test_cookie.value = "hello_fallback";
      cookie.test_cookie.path = "/";
      cookie.test_cookie.maxAge = 3600;
      return "fallback worked";
    }
  })
  .listen(3001);

console.log("Listening on 3001");
