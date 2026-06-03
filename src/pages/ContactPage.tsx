import React, { useState } from "react";
import { Link } from "react-router-dom";
import BrandMark from "../BrandMark";
import ContactCollectionStats from "../ContactCollectionStats";
import usePhotos from "../usePhotos";
import { isSubscribeConfigured, submitPhotoSubscribe } from "../subscribe";
import "../styles/contact.css";

const AUTHOR_EMAIL = "kang1390305137@gmail.com";

export default function ContactPage() {
  const { photos, loading: photosLoading, catalogUpdatedAt } = usePhotos();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  const subscribeReady = isSubscribeConfigured();

  async function onSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setFeedback("");
    const result = await submitPhotoSubscribe(email);
    if (result.ok) {
      setStatus("done");
      setFeedback(result.message);
      setEmail("");
      return;
    }
    setStatus("error");
    setFeedback(result.message);
  }

  return (
    <div className="page contactPage">
      <div className="contactPageGlow" aria-hidden />
      <header className="contactPageHeader">
        <div className="contactPageHeaderInner">
          <Link to="/album" className="contactPageBrand">
            <BrandMark size={32} />
            <span className="brandWordmark">Hayato Photography</span>
          </Link>
          <Link to="/album" className="contactPageBack">
            返回相册
          </Link>
        </div>
      </header>

      <main className="contactPageMain">
        <p className="contactPageEyebrow">Contact</p>
        <h1 className="contactPageTitle">联系作者</h1>
        <p className="contactPageLead">
          感谢浏览这些旅行与光影瞬间。合作、授权或展览洽谈，欢迎来信；也可订阅更新，在新作上架时收到邮件提醒。
        </p>

        <ContactCollectionStats
          photos={photos}
          loading={photosLoading}
          catalogUpdatedAt={catalogUpdatedAt}
        />

        <section className="contactCard contactCard--subscribe" aria-labelledby="subscribe-heading">
          <div className="contactCardIcon" aria-hidden>
            ✦
          </div>
          <h2 id="subscribe-heading" className="contactCardTitle">
            订阅作品更新
          </h2>
          <p className="contactCardText">
            相册有新照片发布时，我们会发送一封简讯到你的邮箱。频率不高，通常仅在集中更新时通知；你随时可通过邮件退订。
          </p>

          <form className="subscribeForm" onSubmit={onSubscribe} noValidate>
            <label className="subscribeFormLabel" htmlFor="subscribe-email">
              你的邮箱
            </label>
            <div className="subscribeFormRow">
              <input
                id="subscribe-email"
                className="subscribeFormInput"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={status === "loading" || status === "done"}
                required
              />
              <button
                type="submit"
                className="subscribeFormBtn"
                disabled={status === "loading" || status === "done"}
              >
                {status === "loading" ? "提交中…" : status === "done" ? "已订阅" : "订阅通知"}
              </button>
            </div>
            {feedback ? (
              <p
                className={
                  "subscribeFormFeedback " +
                  (status === "done" ? "subscribeFormFeedback--ok" : "subscribeFormFeedback--err")
                }
                role="status"
              >
                {feedback}
              </p>
            ) : null}
            {!subscribeReady && status === "idle" ? (
              <p className="subscribeFormHint">
                在线订阅即将开放。你也可先
                <a href={`mailto:${AUTHOR_EMAIL}?subject=${encodeURIComponent("订阅作品更新")}`}>
                  邮件联系作者
                </a>
                登记邮箱。
              </p>
            ) : null}
          </form>
        </section>

        <section className="contactCard contactCard--direct" aria-labelledby="direct-heading">
          <h2 id="direct-heading" className="contactCardTitle">
            直接联系
          </h2>
          <p className="contactCardText">
            拍摄合作、图片授权、展览邀请或个人交流，欢迎写信。我们会在几个工作日内回复；紧急事项请在标题注明「摄影合作」。
          </p>
          <a className="contactMailBtn" href={`mailto:${AUTHOR_EMAIL}`}>
            <span className="contactMailBtnLabel">发送邮件</span>
            <span className="contactMailBtnAddr">{AUTHOR_EMAIL}</span>
          </a>
        </section>

        <p className="contactPageFoot">
          Hayato Photography · 用地图与相册记录路上的光
        </p>
      </main>
    </div>
  );
}
