import React, { PureComponent } from "react";
import { withStyles } from "@material-ui/core/styles";
import ButtonBase from "@material-ui/core/ButtonBase";
import Typography from "../components/Typography";
import styles from './GridStyles'



class Image extends PureComponent {
    constructor() {
        super();

        this.videoRef = React.createRef();
        this.videoMountRef = React.createRef();

        this.state = { mouseOver: false };
    }
    componentDidMount = () => {};


    render() {
        const { image, classes } = this.props;


        return (
            <ButtonBase
                onClick={() => {
                   this.props.showVideoFor(image);
                }}
                className={classes.imageWrapper}
                style={{
                    width: image.width,
                    overflow: "hidden"
                }}
                id={this.props.title}
            >
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#000"
                    }}
                    className={this.props.className}
                    ref={this.videoMountRef}
                >
                    <div 
                     className={classes.imageSrc}
                     style={{
                         backgroundImage: `url(//img.youtube.com/vi/${image.src}/0.jpg)`
                    }}
                    >
                    </div>
                </div>

                <div className={classes.imageBackdrop} />
                <div
                    onMouseOver={this.play}
                    onMouseOut={this.pause}
                    className={classes.imageButton}
                    id={this.props.image.title}
                >
                    <Typography
                        component="h3"
                        variant="h6"
                        color="inherit"
                        className={classes.imageTitle}
                        style={{ pointerEvents: "none" }}
                    >
                        {image.title}
                        <div className={classes.imageMarked} />
                    </Typography>

                    <div className={classes.attrib}>
                        <Typography component="h6" variant="h6" color="inherit">
                            {image.attrib}
                        </Typography>
                        
                    </div>
                </div>
            </ButtonBase>
        );
    }
}

export default withStyles(styles)(Image);
