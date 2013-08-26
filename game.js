function Game() {}

Game.prototype.onGameStart = function() {

  this.game = {
    start: new Date,
    end: undefined,
    score: 0,
    bell: new Howl({
      urls: ['bell.wav'],
    }),
  };

  this.round = {
    lastUpdate: new Date,
    duration: 10000,
    speedChange: .2,
  };

  this.renderer = {};
  this.renderer.canvas = document.getElementById('game');
  this.renderer.ctx = this.renderer.canvas.getContext('2d');

  this.onResize();
  $(window).on('resize', _.bind(this.onResize, this));

  $(this.renderer.canvas).mousedown(_.bind(this.onMouseDown, this));
  $(this.renderer.canvas).mouseup(_.bind(this.onMouseUp, this));

  this.onRoundStart();
  this.registerGameUpdate();

};

Game.prototype.onRoundStart = function() {
  this.bubbles = _.range(10).map(_.bind(function() {
    return {
      position: [ Math.random() * this.renderer.aspect, Math.random() ],
      speed: Math.random() / 2 + .5,
      radius: 0,
    };
  }, this));
  setTimeout(_.bind(this.onRoundEnd, this), this.round.duration);
}

Game.prototype.onRoundEnd = function() {
  if (!this.game.end) {
    this.game.score += this.bubbles.length;
    this.onRoundStart();
  }
}

Game.prototype.onResize = function() {
  this.renderer.canvas.height = $(this.renderer.canvas).height();
  this.renderer.canvas.width = $(this.renderer.canvas).width();
  this.renderer.scale = this.renderer.canvas.height;
  this.renderer.aspect = this.renderer.canvas.width / this.renderer.canvas.height;
};

Game.prototype.onMouseDown = function(event) {
  var bubble = this.getBubbleFromClick(event);
  this.lastBubble = bubble;
  if (bubble) {
    bubble.speed *= this.round.speedChange;
  }
}

Game.prototype.onMouseUp = function(event) {
  var bubble = this.lastBubble;
  this.lastBubble = undefined;
  if (bubble) {
    bubble.speed /= this.round.speedChange;
  }
}

Game.prototype.getBubbleFromClick = function(event) {
  var position = [
    event.clientX / this.renderer.scale,
    event.clientY / this.renderer.scale,
  ];
  return (_.filter(this.bubbles, _.bind(function(bubble) {
    var vector = [
      bubble.position[0] - position[0],
      bubble.position[1] - position[1],
    ];
    var distanceSquared = vector[0] * vector[0] + vector[1] * vector[1];
    return distanceSquared < bubble.radius * bubble.radius;
  }, this)) || [])[0];
};

Game.prototype.registerGameUpdate = function() {
  var updater = _.bind(this.onGameUpdate, this);
  if (!!window.requestAnimationFrame) {
    requestAnimationFrame(updater);
  } else {
    setTimeout(updater, 1000 / 60);
  }
};

Game.prototype.onGameUpdate = function() {
  this.doBubbleSizeUpdate();
  this.doCollisionDetection();
  if (this.bubbles.length === 0 && !this.game.end) {
    this.game.end = new Date;
  }
  this.doRender();
  this.registerGameUpdate();
};

Game.prototype.doBubbleSizeUpdate = function() {
  var thisUpdate = new Date;
  _.each(this.bubbles, _.bind(function(bubble) {
    bubble.radius += bubble.speed * (thisUpdate - this.round.lastUpdate) / this.round.duration / 2;
  }, this));
  this.round.lastUpdate = thisUpdate;
}

Game.prototype.doCollisionDetection = function() {
  var intersecting = [];
  for (i in this.bubbles) {
    for (j in this.bubbles) {
      if (j > i) {
        var minDistance = this.bubbles[i].radius + this.bubbles[j].radius;
        var minDistanceSquared = minDistance * minDistance;
        var vector = [
          this.bubbles[j].position[0] - this.bubbles[i].position[0],
          this.bubbles[j].position[1] - this.bubbles[i].position[1],
        ];
        var actualDistanceSquared = vector[0] * vector[0] + vector[1] * vector[1];
        if (actualDistanceSquared < minDistanceSquared) {
          intersecting.push(this.bubbles[i], this.bubbles[j]);
          this.game.bell.play();
        }
      }
    }
  }
  intersecting = _.uniq(intersecting);
  this.bubbles = _.difference(this.bubbles, intersecting);
};

Game.prototype.doRender = function() {
  var r = this.renderer;
  r.ctx.clearRect(0, 0, r.canvas.width, r.canvas.height);
  r.ctx.shadowColor = 'white';
  r.ctx.shadowBlur = 50;
  _.each(this.bubbles, _.bind(function(bubble) {
    r.ctx.fillStyle = 'rgb(0, ' + Math.floor(bubble.speed * 120) + ', ' + Math.floor(bubble.speed * 160) + ')';
    r.ctx.beginPath();
    r.ctx.arc(
      bubble.position[0] * r.scale,
      bubble.position[1] * r.scale,
      bubble.radius * r.scale,
      0,
      2 * Math.PI
    );
    r.ctx.fill();
  }, this));
  var fontFamily = 'Roboto';
  r.ctx.textAlign = 'center';
  r.ctx.shadowBlur = 20;
  var halfWidth = r.canvas.width / 2;
  var halfHeight = r.canvas.height / 2;
  var scoreText = this.game.score + ' points';
  var seconds = Math.round(((this.game.end || new Date) - this.game.start) / 1000);
  var secondsText = seconds + ' second' + (seconds !== 1 ? 's' : '');
  if (this.bubbles.length > 0) {
    var fontSize = 30;
    r.ctx.font = fontSize + 'px ' + fontFamily;
    r.ctx.fillStyle = 'rgb(0, 80, 120)';
    r.ctx.fillText(secondsText, halfWidth, fontSize);
    r.ctx.fillText(scoreText, halfWidth, 2 * fontSize);
    if (this.game.score === 0) {
      r.ctx.font = fontSize / 2 + 'px ' + fontFamily;
      r.ctx.fillText('Quick! Prevent bubbles from popping!', halfWidth, 3 * fontSize);
    }
  } else {
    var fontSize = 50;
    r.ctx.font = fontSize + 'px ' + fontFamily;
    r.ctx.fillStyle = 'rgb(120, 80, 0)';
    r.ctx.fillText('Game Over', halfWidth, halfHeight);
    r.ctx.fillText(secondsText, halfWidth, halfHeight + fontSize);
    r.ctx.fillText(scoreText, halfWidth, halfHeight + 2 * fontSize);
  }
};

var game;
$(window).load(function() {
  game = new Game;
  game.onGameStart();
});
