exports.openpgp = {
    generate: async (name, email, armored = false) => {
        const openpgp = require('openpgp');
        const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
            date: new Date(Date.now()-1000), type: 'ecc', curve: 'brainpoolP512r1', userIDs: { name: name, email: email }, format: 'armored'
        });
        return { 
            priv: armored ? privateKey : Buffer.from(privateKey).toString('base64'),
            pub: armored ? publicKey : Buffer.from(publicKey).toString('base64'),
            revcert: armored ? revocationCertificate : Buffer.from(revocationCertificate).toString('base64')
        }
    }
}