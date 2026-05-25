function authMiddleware(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/');
}

function adminOnly(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'ADMIN') {
        return next();
    }
    return res.status(403).send('Acesso negado.');
}

function coordinatorOnly(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'COORDINATOR') {
        return next();
    }
    return res.status(403).send('Acesso negado.');
}

function studentOnly(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'STUDENT') {
        return next();
    }
    return res.status(403).send('Acesso negado.');
}

module.exports = {
    authMiddleware,
    adminOnly,
    coordinatorOnly,
    studentOnly
};
