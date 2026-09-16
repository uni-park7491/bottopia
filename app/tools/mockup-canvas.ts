import {imageContain,mockupSizes,type MockupTemplate} from '../../lib/promotion-mockup';
export function drawMockup(canvas:HTMLCanvasElement,template:MockupTemplate,image:ImageBitmap|null,title:string,creator:string,credit:string) {
  const [w,h]=mockupSizes[template];canvas.width=w;canvas.height=h;
  const c=canvas.getContext('2d');if(!c)throw new Error('캔버스를 준비하지 못했습니다.');
  const gallery=template==='gallery';
  c.fillStyle=gallery?'#e8e4dd':'#211a35';c.fillRect(0,0,w,h);
  const margin=gallery?140:64, top=gallery?88:160, bottom=gallery?210:250;
  const fw=w-margin*2,fh=h-top-bottom;
  if(gallery){c.shadowColor='#44362e40';c.shadowBlur=50;c.shadowOffsetY=24;}
  c.fillStyle=gallery?'#fffdf7':'#363044';c.fillRect(margin-16,top-16,fw+32,fh+32);c.shadowBlur=0;c.shadowOffsetY=0;
  c.fillStyle='#171320';c.fillRect(margin,top,fw,fh);
  if(image){const r=imageContain(image.width,image.height,margin,top,fw,fh);c.drawImage(image,r.x,r.y,r.width,r.height);}
  else {c.fillStyle='#d0c8df';c.font='28px sans-serif';c.textAlign='center';c.fillText('작품 이미지를 선택해주세요',w/2,top+fh/2);c.textAlign='left';}
  c.fillStyle=gallery?'#211a35':'#d8ff79';c.font='bold 20px sans-serif';c.fillText('BOTTOPIA / CREATOR WORK',margin,gallery?45:80);
  c.fillStyle=gallery?'#211a35':'#fff';
  let size=56;c.font=`bold ${size}px sans-serif`;while(c.measureText(title).width>fw&&size>20){size-=2;c.font=`bold ${size}px sans-serif`;}
  c.fillText(title||'작품 제목',margin,h-bottom+88,fw);
  c.font='26px sans-serif';c.fillStyle=gallery?'#5c535f':'#cbc3db';c.fillText(creator?`Created by ${creator}`:'',margin,h-bottom+136,fw);
  c.font='18px sans-serif';c.fillText(credit,margin,h-42,fw);
}
