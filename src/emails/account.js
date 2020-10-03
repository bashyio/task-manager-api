const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendWelcomeEmail = (email, name) => {
  sgMail.send({
    to: email,
    from: 'babatunde@bashiruismail.io',
    subject: 'Thanks for joining in!',
    text: `Welcome to the app, ${name}. Let us know how you get along with it.`,
    html: `Welcome to the app, <b>${name}</b>. Let us know how you get along with it.`
  })
}

const sendCancelEmail = (email, name) => {
  sgMail.send({
    to: email,
    from: 'babatunde@bashiruismail.io',
    subject: `We\'re sad to see you go ${name}.`,
    text: `Your account has been deleted ${name} and you will stop getting notifications from us. Is there anything we could have done better?`,
    html: `<p>Your account has been deleted <b>${name}</b> and you will stop getting notifications from us.</p><p>Is there anything we could have done better?</p><p>Please reply to let us know. <b>Thank You!</b></p>`
  })
}

module.exports = {
  sendWelcomeEmail,
  sendCancelEmail
}

/*
const msg = {
  to: 'babatundebash@gmail.com',
  from: 'babatunde@bashiruismail.io',
  subject: 'This is my first creation!',
  text: 'I hope this gets to you!',
  html: '<strong>Testing SendGrid with Node.js</strong>',
}
sgMail
  .send(msg)
  .then(() => {
    console.log('Email sent')
  })
  .catch((error) => {
    console.error(error)
  })
  */