const mongoose = require('mongoose')
const {
  ObjectID
} = require('mongodb')

const uploadSchema = new mongoose.Schema({
  path: {
    type: String,
    unique: true,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalname: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  collectionName: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    required: true,
    ref: 'User'
  }
}, {
  timestamps: true
})

const Upload = mongoose.model('Upload', uploadSchema)

module.exports = Upload