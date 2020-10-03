const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const mime = require('mime-types')
const path = require('path');
const fs = require('fs')
const User = require('../models/user')
const Upload = require('../models/upload')
const auth = require('../middleware/auth')
const {
  sendWelcomeEmail,
  sendCancelEmail
} = require('../emails/account')

const router = new express.Router()

router.post('/users', async (req, res) => {
  try {
    const user = new User(req.body)
    await user.save()
    const token = await user.generateAuthToken()
    sendWelcomeEmail(user.email, user.name)

    res.status(201).send({
      user,
      token
    })
  } catch (e) {
    res.status(400).send(e)
  }
})

router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password)
    const token = await user.generateAuthToken()
    res.status(200).send({
      user,
      token
    })
  } catch (e) {
    res.status(400).send()
  }
})

router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token
    })
    await req.user.save()
    res.status(200).send()
  } catch (e) {
    res.status(500).send()
  }
})

router.post('/users/logoutAll', auth, async (req, res) => {
  try {
    req.user.tokens = []
    await req.user.save()
    res.status(200).send()
  } catch (e) {
    res.status(500).send()
  }
})

router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({})
    res.status(200).send(users)
  } catch (e) {
    res.status(500).send()
  }
})

router.get('/users/me', auth, async (req, res) => {
  res.status(200).send(req.user)
})

router.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body)
  const allowedUpdates = ['name', 'email', 'password', 'age']
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

  if (!isValidOperation) {
    return res.status(400).send({
      error: 'Invalid update'
    })
  }

  try {
    updates.forEach((update) => {
      req.user[update] = req.body[update]
    })
    await req.user.save()
    res.status(200).send(req.user)
  } catch (e) {
    res.status(400).send(e)
  }
})

router.delete('/users/me', auth, async (req, res) => {
  try {
    await req.user.remove()
    sendCancelEmail(req.user.email, req.user.name)
    res.status(200).send(req.user)
  } catch (e) {
    console.log(e)
    res.status(500).send()
  }
})

const storage = multer.diskStorage({
  destination: './store/avatars',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname).toLowerCase());
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 1000000
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(png|gif|jpeg|jpg)+$/i)) {
      return cb(new Error('Please upload a valid image. Only JPG, PNG and GIF files are allowed.'))
    }

    cb(undefined, true)
  }
})

/* Saving the file in Database */
router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    const path = req.file.path
    await sharp(path).resize({
      width: 720,
      height: 720
    }).toBuffer((err, buffer) => {
      fs.writeFileSync(path, buffer);
      /*
        If renaming to PNG, use:
        fs.writeFileSync(path.substring(0, path.lastIndexOf('.')) + ".png", buffer);
        deleteFile(path)
      */
    });

    const upload = new Upload({
      ...req.file,
      owner: req.user.id,
      collectionName: 'users'
    })
    await upload.save()

    if (req.user.avatar) {
      await deleteFile(req.user.avatar)
    }

    req.user.avatar = req.file.path
    await req.user.save()

    res.status(200).send()
  } catch (e) {
    console.log(e)
    res.status(500).send(e)
  }
}, (error, req, res, next) => {
  res.status(400).send({
    error: error.message
  })
})

router.delete('/users/me/avatar', auth, async (req, res) => {
  if (!req.user.avatar) {
    res.status(200).send()
  }

  await deleteFile(req.user.avatar)

  try {
    req.user.avatar = undefined
    await req.user.save()

    res.status(200).send()
  } catch (e) {
    res.status(500).send()
  }
})

//Delete Files to keep things Clean
const deleteFile = async (path) => {
  try {
    fs.unlinkSync(path)

    await Upload.findOneAndDelete({
      path: path
    })
  } catch (e) {}
}

router.get('/users/:id/avatar', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user || !user.avatar) {
      throw new Error()
    }

    const filePath = path.join(__dirname, '../../') + user.avatar

    res.set('Content-Type', mime.lookup(filePath))
    res.status(200).sendFile(filePath)
  } catch (e) {
    res.status(400).send()
  }
})

module.exports = router