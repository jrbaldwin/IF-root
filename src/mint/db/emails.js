var Waterline = require('waterline')
var uuid = require('uuid')
var templates = require('../email_templates')
var co = require('co')
var sendMail = require('../../mail/IF_mail').send

/**
 * Emails collection stores all the common data for any email we send out
 * Considerable insirpation taken from <https://schema.org/EmailMessage>
 */
var emailsCollection = Waterline.Collection.extend({
  identity: 'emails',
  connection: 'default',
  attributes: {
    /** Generated when an email is created */
    id: {
      type: 'string',
      primaryKey: true,
      unique: true,
      index: true,
      uuidv4: true,
      defaultsTo: () => uuid.v4()
    },

    /** User accounts which have email addresses */
    recipients: 'string',

    /** Sender should probably always be kip */
    sender: 'string',

    /** Subjectline */
    subject: 'string',

    /** HTML message, the primary message */
    message_html: 'string',

    /** Text-only fallback for the message */
    message_text_fallback: 'string',

    /** The date on our servers when we sent the message */
    sent_at: 'date',

    /** The template for the email */
    template_name: {
      type: 'string'
    },

    /**
     * The cart associated with this email
     * @type {Cart}
     */
    cart: Waterline.isA('carts'),

    /** Use a template for the email */
    template: function(name, data) {
      this.message_html = templates(name, data)
      this.template_name = name
      return this.save()
    },

    /** send an email */
    send: function () {
      var me = this
      return co(function *() {
    		/**
    			Example from https://nodemailer.com/about/
    			let mailOptions = {
        		from: '"Fred Foo 👻" <foo@blurdybloop.com>', // sender address
        		to: 'bar@blurdybloop.com, baz@blurdybloop.com', // list of receivers
        		subject: 'Hello ✔', // Subject line
        		text: 'Hello world ?', // plain text body
        		html: '<b>Hello world ?</b>' // html body
    			};
    		*/
        var options = {
          from: 'Kip <hello@kipthis.com>',
          to: me.recipients,
          subject: me.subject,
          html: me.message_html,
          text: me.message_text_fallback
        }

        // There is an env variable to control sending emails or nah
        if (!process.env.SEND_EMAILS) {
          console.log('Not sending email (use SEND_EMAILS=1 to actually send an email)')
        } else {
          yield sendMail(options)
        }

        me.sent_at = new Date()
        yield me.save()
      })
    }
  }
})

module.exports = emailsCollection