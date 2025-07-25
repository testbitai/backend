import dotenv from 'dotenv'

dotenv.config()

export const config = {
    PORT : process.env.PORT || 5000,
    MONGODB_URI : process.env.MONGODB_URI || 'mongodb://localhost:27017/devConnect',
    JWT_SECRECT: process.env.JWT_SECRECT || 'supersecret',
}