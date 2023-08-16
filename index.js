const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const app = express();
const stripe = require('stripe')(process.env.PAYMENT_KEY)
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    // console.log(authorization)
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    //bearer token
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hlsud.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const categoriesCollection = client.db('usedMobileBazar').collection('categories');
        const productsCollection = client.db('usedMobileBazar').collection('products');
        const ordersCollection = client.db('usedMobileBazar').collection('orders');
        const usersCollection = client.db('usedMobileBazar').collection('users');

        //jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token })
        })

        //verifyAdmin
        //warning verifyJWT use before verfyAdmin 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbiden message' })
            }
            next()
        }
        // //seller secure 
        // const verifySeller = async (req, res, next) => {
        //     const email = req.decoded.email;
        //     const query = { email: email };
        //     const user = await usersCollection.findOne(query);
        //     if (user?.role !== 'seller') {
        //         return res.status(403).send({ error: true, message: 'forbiden message' })
        //     }
        //     next()
        // }
        // //verifyBuyer secure 
        // const verifyBuyer = async (req, res, next) => {
        //     const email = req.decoded.email;
        //     const query = { email: email };
        //     const user = await usersCollection.findOne(query);
        //     if (user?.role !== 'buyer') {
        //         return res.status(403).send({ error: true, message: 'forbiden message' })
        //     }
        //     next()
        // }


        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already sign in' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        });


        //sign in user collect
        /**
         * do not show secure links to those who should not see the links
         * 1. use jwt token : verify
         * admin verify
         */
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })

        // security layer: verifyJWT
        // email check
        //check admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' };
            res.send(result)
        })
        //seller pannel
        app.get('/users/seller/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ seller: false })
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { seller: user?.role === 'seller' };
            res.send(result)
        })
        // buyer pannel
        app.get('/users/buyer/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ buyer: false })
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { buyer: user?.role === 'buyer' };
            res.send(result)
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await usersCollection.updateOne(query, updatedDoc);
            res.send(result)
        });
        //
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })


        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);

        });

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { phone_id: id };
            const categoryProducts = await productsCollection.find(query).toArray();
            res.send(categoryProducts);
        });
        // get product by adding user email
        app.get('/productsByUser/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { sellerEmail: email };
            const products = await productsCollection.find(query).toArray();
            res.send(products)
        })

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })


        app.post('/orders', async (req, res) => {
            const orders = req.body;
            const query = { productId: orders?.productId };
            const existingOrder = await ordersCollection.findOne(query);
            if (existingOrder) {
                return res.send({ message: 'This order already booked' })
            }
            const result = await ordersCollection.insertOne(orders);
            res.send(result)
        });
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { productId: id };
            const option = { upsert: true };
            const updetDoc = {
                $set: {
                    orderRole: 'sold'
                }
            };
            const result = await ordersCollection.updateOne(filter, updetDoc, option);
            res.send(result);
        })
        //
        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forviden access' })
            }

            const query = { email: email }
            const ordersItem = await ordersCollection.find(query).toArray();
            res.send(ordersItem)
        });

        app.get('/allorders', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {}
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders)
        })

        //
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })

        // payment .....intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;//convert poisa
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

    }
    finally {

    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('used mobile bazar is running');
});


app.listen(port, () => {
    console.log(`server is running on ${port}`)
});


