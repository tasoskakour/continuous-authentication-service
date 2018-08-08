# continuous-authentication-service

[![stack](https://badgen.net/badge/Stack/MEAN/green)](./LICENSE)
 [![license](https://badgen.net/badge/License/MIT/blue)](./LICENSE)
 
### Description
This is a service that provides web applications the ability to authenticate their users not only with username-password by also with their behavior. Specifically, it uses keystroke patterns (keystroke dynamics) to authenticate users and in this way can detect anomalies to typing behaviora detecting possible impostors
 
### Technologies used
- `MEAN Stack`: MongoDB, Express, Angular (4) and Nodejs used for web application. Specifically, MEN is used for handling back-end logic and the service and the Angular is used to provide a front-end dashboard for admin.
- `Python` is used for machine learning (One-Class SVM and GMM) to utilize the continuous authentication mechanism

### Running steps

- `npm install`
- `npm start`

Run `ng serve` for a angular dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Environment Variables

- `KEYSTROKE_DYNAMICS_MLAB_HOST`: Host url for mlab database
- `KEYSTROKE_DYNAMICS_MLAB_USER`: Username of mlab
- `KEYSTROKE_DYNAMICS_MLAB_PASSWORD`: Password of mlab
- `KEYSTROKE_DYNAMICS_TOKEN_SECRET`: Secret for generating jwt tokens

### Running on Heroku

The project is ready to be deployed to a Heroku dyno (as a node & python app). Just run `heroku create` and push the code to your heroku server.

