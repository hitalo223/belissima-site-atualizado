(function(){
  'use strict';

  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals=Array.prototype.slice.call(document.querySelectorAll('.about-reveal'));
  var words=Array.prototype.slice.call(document.querySelectorAll('[data-scroll-word]'));
  var parallaxItems=Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var backgroundTypes=Array.prototype.slice.call(document.querySelectorAll('[data-background-type]'));
  var ticking=false;

  function revealContent(){
    if(reduced||!('IntersectionObserver' in window)){
      reveals.forEach(function(item){item.classList.add('is-visible');});
      return;
    }
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
      });
    },{threshold:.16,rootMargin:'0px 0px -7%'});
    reveals.forEach(function(item){observer.observe(item);});
  }

  function updateScrollEffects(){
    var center=window.innerHeight*.53;
    var nearest=null;
    var nearestDistance=Infinity;
    words.forEach(function(word){
      var rect=word.getBoundingClientRect();
      var distance=Math.abs(rect.top+rect.height/2-center);
      if(distance<nearestDistance){nearestDistance=distance;nearest=word;}
    });
    words.forEach(function(word){word.classList.toggle('is-current',word===nearest&&nearestDistance<window.innerHeight*.46);});

    if(!reduced){
      parallaxItems.forEach(function(item){
        var rect=item.getBoundingClientRect();
        if(rect.bottom<0||rect.top>window.innerHeight)return;
        var strength=Number(item.getAttribute('data-parallax'))||.04;
        var offset=(center-(rect.top+rect.height/2))*strength;
        item.style.setProperty('--parallax-y',offset.toFixed(2)+'px');
      });
    }
    backgroundTypes.forEach(function(item,index){
      var rect=item.parentElement.getBoundingClientRect();
      var progress=(window.innerHeight-rect.top)/(window.innerHeight+rect.height);
      progress=Math.max(0,Math.min(1,progress));
      var direction=index%2===0?1:-1;
      item.style.setProperty('--background-x',((progress-.5)*150*direction).toFixed(1)+'px');
    });
    ticking=false;
  }

  function requestUpdate(){
    if(ticking)return;
    ticking=true;
    window.requestAnimationFrame(updateScrollEffects);
  }

  revealContent();
  updateScrollEffects();
  window.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate);
})();
