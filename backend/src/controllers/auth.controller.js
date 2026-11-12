import { loginUser, registerUser } from '../services/auth.service.js';
import { getTokenExpiry, signAccessToken } from '../utils/jwt.js';

// Express 5 leaves req.body undefined when no JSON body is sent, hence `?? {}`.

export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body ?? {});

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const user = await loginUser(req.body ?? {});
    const token = signAccessToken(user.id);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: { user, token, expiresAt: getTokenExpiry(token) },
    });
  } catch (error) {
    next(error);
  }
};

// req.user is set by requireAuth.
export const getMe = (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
};
