"use strict";

var request = require("request");
("use strict");
const nodemailer = require("nodemailer");
const cheerio = require("cheerio");

require("dotenv").config();

const departureTime = process.env.DEPARTURE_TIME;
const arrivalTime = process.env.ARRIVAL_TIME;
const departure = process.env.DEPARTURE;
const arrival = process.env.ARRIVAL;

const cron = process.env.CRON;


const formatedDepartureTime = new Date(departureTime)
const formatedArrivalTime = new Date(arrivalTime)

const constraint = `${departure} to ${arrival} at ${formatedDepartureTime.toString()} until ${formatedArrivalTime.toString()} `
console.log(`${constraint}\n\n\n`)


var CronJob = require('cron').CronJob;
const main = new CronJob(cron, function() {
  request("https://simulateur.tgvmax.fr/VSC/", (error, response, html) => {
      if (!error && response.statusCode == 200) {
          var $ = cheerio.load(html);
          const hiddenToken = $("#hiddenToken").val();
          console.log(`hiddenToken=${hiddenToken}`);
          const options = {
              url: `https://sncf-simulateur-api-prod.azurewebsites.net/api/RailAvailability/Search/${departure}/${arrival}/${departureTime}/${arrivalTime}`,
              headers: {
                  Accept: "application/json, text/plain, */*",
                  Referer: "https://simulateur.tgvmax.fr/VSC/",
                  Origin: "https://simulateur.tgvmax.fr",
                  "Content-Type": "application/json",
                  ValidityToken: hiddenToken,
                  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
              },
              json: true
          };

          function callback(error2, response2, body2) {
              if (!error2 && response2.statusCode == 200) {
                  const nbTrains = body2.length;
                  console.log(body2)
                  const avaialbleTrains = body2.filter(t => t.availableSeatsCount > 0);
                  if (avaialbleTrains.length > 0) {
                      console.log("alleluja");
                      avaialbleTrains.map(console.log);
                      // Generate test SMTP service account from ethereal.email
                      // Only needed if you don't have a real mail account for testing
                      nodemailer.createTestAccount((err, account) => {
                          // create reusable transporter object using the default SMTP transport

                          const host = process.env.SMTP_SERVER;
                          const port = process.env.SMTP_PORT;
                          const user = process.env.SMTP_USER;
                          const pass = process.env.SMTP_PASSWORD;
                          const receiver = process.env.RECEIVER;
                          const sender = process.env.SENDER;

                          let transporter = nodemailer.createTransport({
                              host: host,
                              port: port,
                              secure: true, // true for 465, false for other ports
                              auth: {
                                  user: user, // generated ethereal user
                                  pass: pass // generated ethereal password
                              }
                          });
                          const traintText = avaialbleTrains.reduce((acc, train) => `${acc}\n\n Train:${train.train} at ${train.departureDateTime} availableSeatsCount:${train.availableSeatsCount}`, '')
                          const text = `We have found trains 🎉\n ${traintText}`
                          // setup email data with unicode symbols
                          let mailOptions = {
                              from: `"TGV max robot 🤖" <${sender}>`, // sender address
                              to: receiver, // list of receivers
                              subject: ` ${constraint} found `, // Subject line
                              text: text, // plain text body
                              html: text.split('\n').join('\n<br>\n') // html body
                          };

                          // send mail with defined transport object
                          transporter.sendMail(mailOptions, (e, info) => {
                              if (e) {
                                  return console.error(e);
                              }
                              console.log("Message sent: %s", info.messageId);
                          });
                      });
                  } else {
                      console.log(`Next time ;), not found over ${nbTrains} trains`);
                  }

              } else {
                  console.error(`Status: ${response2.status}`);
                  console.error(body2);
                  console.error(error2);
                  console.error(response2);
              }
          }

          request(options, callback);
      }
  });
})
 main.start()
