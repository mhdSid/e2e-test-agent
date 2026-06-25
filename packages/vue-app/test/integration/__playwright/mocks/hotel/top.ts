export default {
  "http://localhost:5173": {
    "/hotel/v1/top": {
      "": {
        "status": 200,
        "body": {
          "data": [
            {
              "top": {
                "featured_hotels": [
                  {
                    "hotel_id": 1,
                    "name": "foo",
                    "image_url": "foo",
                    "price_per_night": 1,
                    "rating": 1,
                    "availability": "available",
                    "room_count": 1
                  }
                ],
                "promotions": [
                  {
                    "promo_id": 1,
                    "title": "foo",
                    "url": "foo"
                  }
                ],
                "hero_image_url": null,
                "status": "published"
              }
            }
          ]
        }
      }
    }
  }
}
