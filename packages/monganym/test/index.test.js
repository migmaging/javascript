const chai = require('chai');
const { describe, it } = require('mocha');
const monganym = require('./../lib');
const config = require('./config');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Chance = require('chance');

const DATABASE_TEST = 'test_database';
const MONGO_TEST_URL = process.env.MONGO_TEST_URL || `mongodb://localhost:27017/${DATABASE_TEST}`;

// Create a new schema
const anonymizeSchema = new Schema({
  name: {type: String, required: true},
  email: {type: String, required: true},
  address: {
    name: {type: String, required: true},
    phone: {type: String, required: true},
    country: {type: String, required: true}
  }
});

//Create a new collection called 'User'
const User = mongoose.model('users', anonymizeSchema);
const chance = new Chance('test_database');

//create a new user
const createUser = () => ({
  name: chance.first(),
  email: chance.string(),
  address: {
    name: chance.string(),
    phone: chance.phone(),
    country: chance.country()
  }
});

describe('Test anonymize script', () => {

  before(function (done) {

    this.chance = new Chance(DATABASE_TEST);
    mongoose.connect(MONGO_TEST_URL);
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error'));
    db.once('open', function () {
      done();
    });
  });

  after(function (done) {
    mongoose.connection.db.dropDatabase(function () {
      mongoose.connection.close(done);
    });
  });

  describe('with invalid config file', () => {
    it('should throw an error', async () => {
      const user = await User(createUser()).save();
      try {
        await monganym(MONGO_TEST_URL, {"collections": []});
      } catch (e) {
        User.findOne({_id: user._id}, (err, elt) => {
          if (err) {
            throw err
          }
          chai.expect(elt.email).to.equal(user.email);
        });
      }
    });
  });

  describe('with valid config file', () => {
    it('should anonymize', async () => {
      const user = await User(createUser()).save();
      await monganym(MONGO_TEST_URL, config);
      User.findOne({_id: user._id}, (err, elt) => {
        if (err) {
          throw err
        }
        chai.expect(elt.name).to.not.equal(user.name);
        chai.expect(elt.email).to.not.equal(user.email);
        chai.expect(elt.address.name).to.not.equal(user.address.name);
        chai.expect(elt.address.phone).to.not.equal(user.address.phone);
        chai.expect(elt.address.country).to.equal(user.address.country);
      });
    });
  });
});