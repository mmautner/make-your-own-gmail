# Make Your Own Gmail.com

A customizable, independent interface to your Gmail account.

![](app/img/usage.png =600x)

This is an editable scaffold for building your own interface for interacting with your Gmail email account. Familiarity with [JavaScript](http://www.tutorialspoint.com/javascript/) and [AngularJS](http://www.tutorialspoint.com/angularjs/) is ideal.

### Development

The only software prerequisite is `npm` ([install instructions](https://www.youtube.com/watch?v=wREima9e6vk)).

Then the following steps will get your local development server running:

```
$ npm install
$ bower install
$ grunt serve

Server started on port 3474
```

You're good to go, try accessing http://localhost:3474/

---

Please replace the GOOGLE_CLIENT_ID in `.env` by obtaining your own 
[Google client ID](http://www.sanwebe.com/2012/10/creating-google-oauth-api-key).

Install [autoenv](https://github.com/kennethreitz/autoenv) to automatically 
create this environment variable when using this repo.

### Resources

- https://developers.google.com/gmail/api/quickstart/js
- https://github.com/maximepvrt/angular-google-gapi/
- https://developers.google.com/api-client-library/javascript/start/start-js
