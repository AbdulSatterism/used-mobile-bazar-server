const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());

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

        //sign in user collect
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already sign in' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
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
        // 
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { phone_id: id };
            const categoryProducts = await productsCollection.find(query).toArray();
            res.send(categoryProducts);
        });

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
        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const ordersItem = await ordersCollection.find(query).toArray();
            res.send(ordersItem)
        });
        // app.get('/allorders', async (req, res) => {

        //     const query = {  }
        //     const orders = await ordersCollection.find(query).toArray();
        //     res.send(orders)
        // })

        //
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
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


