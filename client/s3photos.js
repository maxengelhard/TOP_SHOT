const albumBucketName = 'top-shot-images';


AWS.config.region = 'us-east-2'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-2:3bb41a33-ac2d-45ce-aa97-e0e497f51e94',
});

// Create a new service object
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: {Bucket: albumBucketName}
});


// Show the photos that exist in an album.
const viewAlbum = (albumName) => {
    var albumPhotosKey = encodeURIComponent(albumName) + '/';
    s3.listObjects({Prefix: albumPhotosKey}, function(err, data) {
      if (err) {
        return alert('There was an error viewing your album: ' + err.message);
      }
      // 'this' references the AWS.Request instance that represents the response
      var href = this.request.httpRequest.endpoint.href;
      var bucketUrl = href + albumBucketName + '/';
      var photos = data.Contents.map(photo => {

        var photoKey = photo.Key;
        var photoUrl = bucketUrl + encodeURIComponent(photoKey);
        return photoUrl
      });

      document.getElementById('index-img') ? document.getElementById('index-img').src = photos[1] : null
      document.getElementById('logo').src = photos[2]
    });
  }



viewAlbum('theseImages')